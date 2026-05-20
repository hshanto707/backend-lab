import { z } from 'zod';

export const configSchema = z.object({
    PORT: z.number(),
    NODE_ENV: z.enum(['test', 'dev', 'prod']).default('dev'),
    REDIS_URL: z.string(),
    REDIS_CONNECT_ATTEMPTS: z.number(),
    VALKEY_URL: z.string(),
    MONGODB_URI: z.string(),
    MONGODB_DB: z.string(),
})