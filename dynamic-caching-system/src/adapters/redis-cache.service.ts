import { createClient } from "redis";
import { ICacheService } from "../interfaces/cache-service.interface.js";

type RedisClient = ReturnType<typeof createClient>;

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
