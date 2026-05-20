import { CoreProvider } from "../providers/core.provider.js";

export default class BaseService {
    private coreProvider: CoreProvider;

    constructor() {
        this.coreProvider = CoreProvider.getInstance();
    }

    async getSum() {
        try {
            const cacheService = this.coreProvider.getCacheService();

            const n = await cacheService.get("n");
            if (!n) throw new Error("N not found");

            const value = await cacheService.get(String(n));

            if (value) {
                console.log('got from cache');
                return value;
            }

            let sum = 0;

            for (let i = 1; i <= Number(n); i++) sum += i;

            await cacheService.set(String(n), sum, 120);

            return sum;
        } catch (error) {
            throw new Error("Error getting sum: " + error);
        }
    }
}
