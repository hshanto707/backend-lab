import { ICacheService } from "../interfaces/cache-service.interface.js";

type Entry = { payload: string; expiresAt: number };

export class MemoryCacheService implements ICacheService {
    static createRoot(): MemoryCacheService {
        return new MemoryCacheService(new Map(), "");
    }

    private constructor(
        private readonly store: Map<string, Entry>,
        private readonly keyPrefix: string,
    ) {}

    private fullKey(key: string): string {
        return this.keyPrefix ? `${this.keyPrefix}:${key}` : key;
    }

    async set(key: string, value: unknown, ttl: number): Promise<"OK"> {
        const payload = JSON.stringify(value);
        this.store.set(this.fullKey(key), {
            payload,
            expiresAt: Date.now() + ttl * 1000,
        });
        return "OK";
    }

    async get(key: string): Promise<unknown | null> {
        const k = this.fullKey(key);
        const row = this.store.get(k);
        if (!row) return null;
        if (Date.now() > row.expiresAt) {
            this.store.delete(k);
            return null;
        }
        try {
            return JSON.parse(row.payload) as unknown;
        } catch {
            return row.payload;
        }
    }

    async delete(key: string): Promise<number> {
        return this.store.delete(this.fullKey(key)) ? 1 : 0;
    }

    async clear(): Promise<"OK"> {
        if (!this.keyPrefix) {
            this.store.clear();
            return "OK";
        }
        const prefix = `${this.keyPrefix}:`;
        for (const k of [...this.store.keys()]) {
            if (k === this.keyPrefix || k.startsWith(prefix)) {
                this.store.delete(k);
            }
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
        return new MemoryCacheService(this.store, nextPrefix);
    }
}
