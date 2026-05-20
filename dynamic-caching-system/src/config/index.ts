import { IAppConfigOptions } from "./config.interface.js"
import { configSchema } from "./config.schema.js";
import dotenv from 'dotenv';
import fs from 'node:fs';

export class AppConfig {
    static instance: AppConfig
    private config!: IAppConfigOptions;

    constructor() {
        if (!AppConfig.instance) {
            this.config = this.loadAndValidateConfig()
            AppConfig.instance = this;
        }

        return AppConfig.instance;
    }

    loadAndValidateConfig(): IAppConfigOptions {
        const environment = process.env.NODE_ENV || 'dev'

        if (!configSchema) {
            throw new Error(`Config schema file not found`);
        }

        // Load corresponding .env file
        const envFile = ".env";
        if (!fs.existsSync(envFile) && environment === 'dev') {
            throw new Error("File .env.dev not found");
        }

        dotenv.config({path: envFile});
        const finalConfig: Record<string, unknown> = {};
        for (const key of Object.keys(configSchema.shape) as Array<keyof typeof configSchema.shape>) {
            if (Object.prototype.hasOwnProperty.call(process.env, key)) {
                let value: unknown = process.env[key];
                const expectedType = configSchema.shape[key].def.type;

                if (expectedType === 'number') {
                    value = Number(value);
                }

                finalConfig[key] = value;
            }
        }

        const validationResult = configSchema.safeParse(finalConfig);

        if (!validationResult.success) {
            const missingKeys = validationResult.error.issues
                .map(issue => issue.path.join('.'))
                .join(', ');

                throw new Error(`Config validation error: missing properties ${missingKeys}`);
        }

        return validationResult.data as unknown as IAppConfigOptions;
    }

    public static getInstance(): AppConfig {
        if (!AppConfig.instance) {
            AppConfig.instance = new AppConfig();
        }

        return AppConfig.instance;
    }

    getConfig() {
        return this.config;
    }

    public static resetInstance(): void {
        AppConfig.instance = undefined as unknown as AppConfig;
    }
}

export default AppConfig;