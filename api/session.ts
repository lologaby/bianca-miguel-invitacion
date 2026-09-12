import { publicGuest, readPrivateEvent } from './_data.js';
import { activeGuest } from './_guest-session.js';
import { readSavedRsvp } from './_rsvp-store.js';
import { jsonError, type ApiRequest, type ApiResponse } from './_security.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json(jsonError('method_not_allowed', 'Método no permitido.'));
  try {
    const guest = await activeGuest(req);
    if (!guest) return res.status(401).json(jsonError('unauthorized', 'No hay una invitación activa.'));
    return res.status(200).json({ guest: publicGuest(guest), event: readPrivateEvent(), rsvp: await readSavedRsvp(guest.id) });
  } catch {
    return res.status(503).json(jsonError('not_configured', 'La invitación aún no está configurada.'));
  }
}
