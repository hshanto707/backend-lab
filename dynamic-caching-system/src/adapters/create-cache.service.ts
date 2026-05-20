import type { ICacheService } from "../interfaces/cache-service.interface.js";
import { CacheType } from "../types/cache.types.js";
import { createMongoBackedCache } from "./mongodb-cache.service.js";
import { createRedisBackedCache } from "./redis-cache.service.js";

export async function createCacheService(
  cacheType: CacheType,
): Promise<ICacheService> {
  switch (cacheType) {
    case CacheType.Redis:
      return createRedisBackedCache({
        url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
        label: "Redis",
      });

    case CacheType.Valkey:
      return createRedisBackedCache({
        url: process.env.VALKEY_URL ?? "redis://127.0.0.1:6380",
        label: "Valkey",
      });

    case CacheType.MongoDb:
      return createMongoBackedCache();

    default: {
      const _exhaustive: never = cacheType;
      throw new Error(`Unhandled cache type: ${_exhaustive}`);
    }
  }
}
