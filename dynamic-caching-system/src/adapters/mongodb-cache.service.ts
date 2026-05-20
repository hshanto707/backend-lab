import type { Collection } from "mongodb";
import { MongoClient } from "mongodb";
import { ICacheService } from "../interfaces/cache-service.interface.js";
import { MemoryCacheService } from "./memory-cache.service.js";

interface MongoCacheDoc {
    key: string;
    payload: string;
    expiresAt: Date;
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class MongoCacheService implements ICacheService {
    constructor(
        private readonly collection: Collection<MongoCacheDoc>,
        private readonly keyPrefix = "",
    ) {}

    private fullKey(key: string): string {
        return this.keyPrefix ? `${this.keyPrefix}:${key}` : key;
    }

    async set(key: string, value: unknown, ttl: number): Promise<"OK"> {
        const fk = this.fullKey(key);
        const payload = JSON.stringify(value);
        const expiresAt = new Date(Date.now() + ttl * 1000);
        await this.collection.replaceOne(
            { key: fk },
            { key: fk, payload, expiresAt },
            { upsert: true },
        );
        return "OK";
    }

    async get(key: string): Promise<unknown | null> {
        const fk = this.fullKey(key);
        const doc = await this.collection.findOne({
            key: fk,
            expiresAt: { $gt: new Date() },
        });
        if (!doc) return null;
        try {
            return JSON.parse(doc.payload) as unknown;
        } catch {
            return doc.payload;
        }
    }

    async delete(key: string): Promise<number> {
        const r = await this.collection.deleteOne({ key: this.fullKey(key) });
        return r.deletedCount ?? 0;
    }

    async clear(): Promise<"OK"> {
        if (!this.keyPrefix) {
            await this.collection.deleteMany({});
            return "OK";
        }
        const escaped = escapeRegex(this.keyPrefix);
        await this.collection.deleteMany({
            $or: [{ key: this.keyPrefix }, { key: { $regex: `^${escaped}:` } }],
        });
        return "OK";
    }

    async remember(
        key: string,
        ttl: number,
        callback: () => Promise<unknown>,
    ): Promise<unknown> {
        const existing = await this.get(key);
        if (existing !== null) return existing;
        const value = await callback();
        await this.set(key, value, ttl);
        return value;
    }

    connection(name: string): ICacheService {
        const nextPrefix = this.keyPrefix ? `${this.keyPrefix}:${name}` : name;
        return new MongoCacheService(this.collection, nextPrefix);
    }
}

export async function createMongoBackedCache(): Promise<ICacheService> {
    const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
    const dbName = process.env.MONGODB_DB ?? "dynamic_caching";

    let client: MongoClient | undefined;
    try {
        client = new MongoClient(uri);
        await client.connect();

        const coll = client
            .db(dbName)
            .collection<MongoCacheDoc>("cache_entries");
        await coll.createIndex({ key: 1 }, { unique: true });
        await coll.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

        console.log("Connected to MongoDB cache");

        return new MongoCacheService(coll);
    } catch (err) {
        if (client) {
            try {
                await client.close();
            } catch {
                /* ignore */
            }
        }

        const msg = err instanceof Error ? err.message : String(err);

        console.warn(
            `MongoDB cache unavailable (${msg}); continuing with in-memory cache`,
        );
        
        return MemoryCacheService.createRoot();
    }
}
