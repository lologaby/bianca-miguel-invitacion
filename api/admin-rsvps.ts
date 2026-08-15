import { Redis } from '@upstash/redis';
import { isAdmin } from './_admin.js';
import { readGuests } from './_data.js';
import { jsonError, type ApiRequest, type ApiResponse } from './_security.js';

interface StoredRsvp { attendance: 'yes' | 'no'; partySize: number; plusOneName?: string; song?: string; updatedAt: string }
const redis = Redis.fromEnv();

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json(jsonError('method_not_allowed', 'Método no permitido.'));
  if (!isAdmin(req)) return res.status(401).json(jsonError('unauthorized', 'Acceso no autorizado.'));
  let guests;
  try { guests = readGuests(); } catch { return res.status(503).json(jsonError('not_configured', 'La lista de invitados aún no está configurada.')); }
  const keys = guests.map((guest) => `rsvp:bianca-placeholder-2026:${guest.id}`);
  const responses = keys.length ? await redis.mget<(StoredRsvp | null)[]>(...keys) : [];
  const records = guests.map((guest, index) => {
    const response = responses[index];
    return {
      guestId: guest.id,
      name: guest.name,
      invited: guest.partyLimit,
      attendance: response?.attendance ?? 'pending',
      partySize: response?.partySize ?? 0,
      plusOneName: response?.plusOneName ?? '',
      song: response?.song ?? '',
      updatedAt: response?.updatedAt ?? '',
    };
  });
  return res.status(200).json({ records });
}
