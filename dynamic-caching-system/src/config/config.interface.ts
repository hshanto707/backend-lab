export type envType = "test | dev | prod";

export interface IAppConfigOptions {
    PORT: number;
    NODE_ENV: envType;
    REDIS_URL: string;
    REDIS_CONNECT_ATTEMPTS: number;
    VALKEY_URL: string;
    MONGODB_URI: string;
    MONGODB_DB: string;
}
