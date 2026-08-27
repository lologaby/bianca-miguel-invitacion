import { createClient, type RedisClientType } from 'redis';

/**
 * The store behind rate limiting and the RSVP records.
 *
 * These functions were written against @upstash/redis, which talks REST and
 * reads UPSTASH_REDIS_REST_URL / _TOKEN. The database provisioned on this
 * project is Vercel's managed Redis, which speaks the TCP protocol and exposes
 * a single REDIS_URL — so the client changed rather than the database.
 *
 * The surface here matches the four calls the handlers already make, so the
 * call sites did not have to change. One difference is hidden: @upstash/redis
 * serialises objects for you and node-redis does not, so `set` and `mget` do
 * the JSON round-trip.
 */
let client: RedisClientType | null = null;

async function connection(): Promise<RedisClientType> {
  if (!client) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('REDIS_URL is not configured');
    client = createClient({ url });
    // a transient socket error must not take the whole function down
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

  /**
   * Count an attempt, and say whether the caller is over the limit.
   *
   * Returns `true` when the store is unreachable. Rate limiting exists to stop
   * someone grinding through invitation codes, so losing Redis has to mean
   * "refuse", not "let everyone through" — and it must refuse without throwing,
   * which previously surfaced as a bare FUNCTION_INVOCATION_FAILED.
   */
  async overLimit(key: string, max: number, windowSeconds: number) {
    try {
      const attempts = await this.incr(key);
      if (attempts === 1) await this.expire(key, windowSeconds);
      return attempts > max;
    } catch {
      return true;
    }
  },
  async set(key: string, value: unknown) {
    return (await connection()).set(key, JSON.stringify(value));
  },
  async mget<T>(...keys: string[]): Promise<(T | null)[]> {
    if (!keys.length) return [];
    const raw = await (await connection()).mGet(keys);
    return raw.map((value) => {
      if (typeof value !== 'string') return null;
      try { return JSON.parse(value) as T; } catch { return null; }
    });
  },
};
