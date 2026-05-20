import { createClient } from "redis";
import { ICacheService } from "../interfaces/cache-service.interface.js";
import { MemoryCacheService } from "./memory-cache.service.js";

export type RedisClient = ReturnType<typeof createClient>;

const REDIS_CONNECT_ATTEMPTS = Number(
    process.env.REDIS_CONNECT_ATTEMPTS ?? "5",
);

export class RedisCacheService implements ICacheService {
    constructor(
        private readonly client: RedisClient,
        private readonly keyPrefix = "",
    ) {}

    private fullKey(key: string): string {
        return this.keyPrefix ? `${this.keyPrefix}:${key}` : key;
    }

    async set(key: string, value: unknown, ttl: number): Promise<"OK"> {
        const payload = JSON.stringify(value);

        await this.client.set(this.fullKey(key), payload, { EX: ttl });

        return "OK";
    }

    async get(key: string): Promise<unknown | null> {
        const raw = await this.client.get(this.fullKey(key));
        if (raw === null) return null;

        try {
            return JSON.parse(raw) as unknown;
        } catch {
            return raw;
        }
    }

    async delete(key: string): Promise<number> {
        return this.client.del(this.fullKey(key));
    }

    async clear(): Promise<"OK"> {
        if (!this.keyPrefix) {
            await this.client.flushDb();
            return "OK";
        }

        const pattern = `${this.keyPrefix}:*`;

        for await (const redisKey of this.client.scanIterator({
            MATCH: pattern,
            COUNT: 100,
        })) {
            await this.client.del(redisKey);
        }
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

        return new RedisCacheService(this.client, nextPrefix);
    }
}

/** Connect to Redis-compatible servers (Redis, Valkey); falls back to in-memory cache. */
export async function createRedisBackedCache(opts: {
    url: string;
    label: string;
}): Promise<ICacheService> {
    const client = createClient({
        url: opts.url,
        socket: {
            connectTimeout: 10_000,
            reconnectStrategy: (retries) => Math.min(retries * 100, 3_000),
        },
    });

    client.on("error", (err) =>
        console.error(`${opts.label} client error:`, err.message),
    );

    const maxAttempts = Number.isFinite(REDIS_CONNECT_ATTEMPTS)
        ? Math.max(1, REDIS_CONNECT_ATTEMPTS)
        : 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            if (!client.isOpen) await client.connect();

            await client.flushDb();
            console.log(`Connected to ${opts.label}`);

            return new RedisCacheService(client);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);

            console.error(
                `${opts.label} connect attempt ${attempt}/${maxAttempts}:`,
                msg,
            );

            await new Promise((r) => setTimeout(r, 1_000));
        }
    }

    try {
        if (client.isOpen) await client.quit();
    } catch {
        /* ignore quit errors */
    }

    console.warn(
        `${opts.label} unavailable; continuing with in-memory cache (no external cache)`,
    );

    return MemoryCacheService.createRoot();
}
