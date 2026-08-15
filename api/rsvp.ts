import { Redis } from '@upstash/redis';
import { jsonError, readSession, type ApiRequest, type ApiResponse } from './_security.js';
const redis = Redis.fromEnv(); const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json(jsonError('method_not_allowed', 'Método no permitido.'));
  if (!req.headers['content-type']?.includes('application/json')) return res.status(415).json(jsonError('invalid_content_type', 'Contenido no válido.'));
  const guest = readSession(req); if (!guest) return res.status(401).json(jsonError('unauthorized', 'Tu sesión expiró. Vuelve a entrar con tu código.'));
  const attendance = req.body?.attendance; if (attendance !== 'yes' && attendance !== 'no') return res.status(400).json(jsonError('invalid_attendance', 'Selecciona una respuesta.'));
  const partySize = attendance === 'yes' ? Number(req.body?.partySize) : 0; if (!Number.isInteger(partySize) || partySize < 0 || partySize > guest.partyLimit) return res.status(400).json(jsonError('invalid_party_size', 'Cantidad de asistentes no válida.'));
  const record = { event: 'bianca-placeholder-2026', guestId: guest.id, attendance, partySize, plusOneName: guest.plusOneAllowed ? text(req.body?.plusOneName, 80) : '', dietary: text(req.body?.dietary, 300), accessibility: text(req.body?.accessibility, 300), song: text(req.body?.song, 120), updatedAt: new Date().toISOString() };
  await redis.set(`rsvp:${record.event}:${guest.id}`, record); return res.status(200).json({ ok: true });
}
