import { ICacheService } from "../interfaces/cache-service.interface.js";

export type CoreDeps = {
  cache: ICacheService;
};

export class CoreProvider {
  private static instance: CoreProvider;
  private readonly cache: ICacheService;

  private constructor(deps: CoreDeps) {
    this.cache = deps.cache;
  }

  static initialize(deps: CoreDeps): void {
    if (CoreProvider.instance) {
      throw new Error("CoreProvider already initialized");
    }
    CoreProvider.instance = new CoreProvider(deps);
  }

  static getInstance(): CoreProvider {
    if (!CoreProvider.instance) {
      throw new Error("CoreProvider not initialized");
    }
    return CoreProvider.instance;
  }

  getCacheService(): ICacheService {
    return this.cache;
  }
}
