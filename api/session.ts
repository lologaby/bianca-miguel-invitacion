import { publicGuest, readGuests, readPrivateEvent } from './_data.js';
import { jsonError, readSession, type ApiRequest, type ApiResponse } from './_security.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json(jsonError('method_not_allowed', 'Método no permitido.'));
  const session = readSession(req);
  if (!session) return res.status(401).json(jsonError('unauthorized', 'No hay una invitación activa.'));
  try {
    const guest = readGuests().find((record) => record.id === session.id);
    if (!guest) return res.status(401).json(jsonError('unauthorized', 'No hay una invitación activa.'));
    return res.status(200).json({ guest: publicGuest(guest), event: readPrivateEvent() });
  } catch {
    return res.status(503).json(jsonError('not_configured', 'La invitación aún no está configurada.'));
  }
}
