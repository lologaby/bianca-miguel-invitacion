import { createClient, type RedisClientType } from 'redis';

/* The existing JSON records live in Vercel Redis over its TCP connection. */
let client: RedisClientType | null = null;

async function connection(): Promise<RedisClientType> {
  if (!client) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('REDIS_URL is not configured');
    client = createClient({ url });
    client.on('error', () => undefined);
  }
  if (!client.isOpen) await client.connect();
  return client;
}

export const redis = {
  async incr(key: string) {
    return (await connection()).incr(key);
  },
  async expire(key: string, seconds: number) {
    return (await connection()).expire(key, seconds);
  },
  async overLimit(key: string, max: number, windowSeconds: number) {
    try {
      const attempts = await this.incr(key);
      if (attempts === 1) await this.expire(key, windowSeconds);
      return attempts > max;
    } catch {
      return true;
    }
  },
  async get<T>(key: string): Promise<T | null> {
    const raw = await (await connection()).get(key);
    if (typeof raw !== 'string') return null;
    // Corrupt data is a failure, not an empty list of revoked invitations.
    return JSON.parse(raw) as T;
  },
  async set(key: string, value: unknown) {
    return (await connection()).set(key, JSON.stringify(value));
  },
  async setIfAbsent(key: string, value: unknown) {
    return await (await connection()).set(key, JSON.stringify(value), { NX: true }) === 'OK';
  },
  async mget<T>(...keys: string[]): Promise<(T | null)[]> {
    if (!keys.length) return [];
    const raw = await (await connection()).mGet(keys);
    return raw.map((value) => typeof value === 'string' ? JSON.parse(value) as T : null);
  },
  async eval(script: string, keys: string[], args: string[]) {
    return (await connection()).eval(script, { keys, arguments: args });
  },
};
