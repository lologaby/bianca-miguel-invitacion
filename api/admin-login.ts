import { Redis } from '@upstash/redis';
import { clientIp, jsonError, type ApiRequest, type ApiResponse } from './_security.js';
import { signAdminSession, validAdminPassword } from './_admin.js';
import { createHash } from 'node:crypto';

const redis = Redis.fromEnv();

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json(jsonError('method_not_allowed', 'Método no permitido.'));
  if (!req.headers['content-type']?.includes('application/json')) return res.status(415).json(jsonError('invalid_content_type', 'Contenido no válido.'));
  const ipHash = createHash('sha256').update(clientIp(req)).digest('hex').slice(0, 20);
  const attempts = await redis.incr(`admin-attempt:${ipHash}`);
  if (attempts === 1) await redis.expire(`admin-attempt:${ipHash}`, 900);
  if (attempts > 8) return res.status(429).json(jsonError('rate_limited', 'Intenta nuevamente más tarde.'));
  if (!validAdminPassword(req.body?.password)) return res.status(401).json(jsonError('invalid_credentials', 'Acceso no válido.'));
  const secure = process.env.VERCEL_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `bianca_admin=${signAdminSession()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${secure}`);
  return res.status(200).json({ ok: true });
}
