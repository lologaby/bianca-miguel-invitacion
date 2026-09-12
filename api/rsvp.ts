import { readSavedRsvp, saveRsvpOnce, type RsvpRecord } from './_rsvp-store.js';
import { activeGuest } from './_guest-session.js';
import { jsonError, type ApiRequest, type ApiResponse } from './_security.js';
const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json(jsonError('method_not_allowed', 'Método no permitido.'));
  if (!req.headers['content-type']?.includes('application/json')) return res.status(415).json(jsonError('invalid_content_type', 'Contenido no válido.'));
  try {
    const guest = await activeGuest(req);
    if (!guest) return res.status(401).json(jsonError('unauthorized', 'Tu sesión expiró. Vuelve a entrar con tu código.'));
    const existing = await readSavedRsvp(guest.id);
    if (existing) return res.status(200).json({ ok: true, rsvp: existing });
    const attendance = req.body?.attendance;
    if (attendance !== 'yes' && attendance !== 'no') return res.status(400).json(jsonError('invalid_attendance', 'Selecciona una respuesta.'));
    const partySize = attendance === 'yes' ? Number(req.body?.partySize) : 0;
    if (!Number.isInteger(partySize) || partySize < (attendance === 'yes' ? 1 : 0) || partySize > guest.partyLimit) {
      return res.status(400).json(jsonError('invalid_party_size', 'Cantidad de asistentes no válida.'));
    }
    const record: RsvpRecord = { event: 'bianca-placeholder-2026', guestId: guest.id, attendance, partySize, plusOneName: guest.plusOneAllowed ? text(req.body?.plusOneName, 80) : '', dietary: text(req.body?.dietary, 300), accessibility: text(req.body?.accessibility, 300), song: text(req.body?.song, 120), updatedAt: new Date().toISOString() };
    const rsvp = await saveRsvpOnce(record);
    return res.status(200).json({ ok: true, rsvp });
  } catch {
    console.warn('rsvp_store_unavailable');
    return res.status(503).json(jsonError('store_unavailable', 'No se pudo guardar la respuesta. Inténtalo de nuevo.'));
  }
}
