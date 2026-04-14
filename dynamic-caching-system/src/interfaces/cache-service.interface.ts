export interface ICacheService<T = unknown> {
  set(key: string, value: T, ttl: number): Promise<'OK'>;
  get(key: string): Promise<T | null>;
  delete(key: string): Promise<number>;
  clear(): Promise<'OK'>;
  remember(key: string, ttl: number, callback: () => Promise<T>): Promise<T>;
  connection(name: string): ICacheService<T>;
}
