import { redis } from './_redis.js';
import { createHash, timingSafeEqual } from 'node:crypto';
import { publicGuest, readGuests, readPrivateEvent } from './_data.js';
import { clientIp, jsonError, signSession, type ApiRequest, type ApiResponse } from './_security.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json(jsonError('method_not_allowed', 'Método no permitido.'));
  if (!req.headers['content-type']?.includes('application/json')) return res.status(415).json(jsonError('invalid_content_type', 'Contenido no válido.'));
  const ipHash = createHash('sha256').update(clientIp(req)).digest('hex').slice(0, 20);
  const attempts = await redis.incr(`guest-attempt:${ipHash}`);
  if (attempts === 1) await redis.expire(`guest-attempt:${ipHash}`, 600);
  if (attempts > 12) return res.status(429).json(jsonError('rate_limited', 'Intenta nuevamente más tarde.'));

  const codeValue = req.body?.code;
  const linkValue = req.body?.linkToken;
  const code = typeof codeValue === 'string' ? codeValue.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
  const linkToken = typeof linkValue === 'string' ? linkValue.trim() : '';
  if (!code && !linkToken) return res.status(400).json(jsonError('invalid_invitation', 'Invitación no válida.'));

  try {
    const guests = readGuests();
    const candidate = createHash('sha256').update(linkToken || code).digest();
    const match = guests.find((guest) => {
      const storedValue = linkToken ? guest.linkHash : guest.codeHash;
      if (!storedValue) return false;
      const stored = Buffer.from(storedValue, 'hex');
      return stored.length === candidate.length && timingSafeEqual(stored, candidate);
    });
    if (!match) return res.status(401).json(jsonError('invalid_invitation', 'Invitación no válida.'));
    const session = signSession({ id: match.id, name: match.name, partyLimit: match.partyLimit, plusOneAllowed: match.plusOneAllowed });
    const secure = process.env.VERCEL_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `bianca_session=${session}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000${secure}`);
    return res.status(200).json({ guest: publicGuest(match), event: readPrivateEvent() });
  } catch {
    return res.status(503).json(jsonError('not_configured', 'La invitación aún no está configurada.'));
  }
}
