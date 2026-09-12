import { randomBytes } from 'node:crypto';
import { isAdmin } from './_admin.js';
import { addedGuests, allGuests, createAddedGuest, guestId, hashCode, hashToken, readableCode, removeGuest } from './_guests-store.js';
import { jsonError, type ApiRequest, type ApiResponse } from './_security.js';

const MAX_GUESTS = 400;
const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';

/** Codes and links are returned only on creation; Redis keeps their hashes. */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAdmin(req)) return res.status(401).json(jsonError('unauthorized', 'Acceso no autorizado.'));

  try {
    if (req.method === 'GET') {
      const guests = await allGuests();
      const added = new Set((await addedGuests()).map((guest) => guest.id));
      return res.status(200).json({
        guests: guests.map((guest) => ({
          id: guest.id,
          name: guest.name,
          partyLimit: guest.partyLimit,
          plusOneAllowed: guest.plusOneAllowed,
          editable: added.has(guest.id),
        })),
      });
    }

    if (req.method === 'DELETE') {
      const fromQuery = req.query?.id;
      const id = text(Array.isArray(fromQuery) ? fromQuery[0] : fromQuery, 200) || text(req.body?.id, 200);
      if (!id) return res.status(400).json(jsonError('invalid_id', 'Falta la invitación a eliminar.'));
      if (!await removeGuest(id)) return res.status(404).json(jsonError('not_found', 'Esa invitación ya no existe.'));
      return res.status(200).json({ removed: id });
    }

    if (req.method !== 'POST') return res.status(405).json(jsonError('method_not_allowed', 'Método no permitido.'));
    if (!req.headers['content-type']?.includes('application/json')) {
      return res.status(415).json(jsonError('invalid_content_type', 'Contenido no válido.'));
    }
    const name = text(req.body?.name, 80);
    if (!name) return res.status(400).json(jsonError('invalid_name', 'Escribe el nombre de la invitación.'));
    const partyLimitRaw = Number(req.body?.partyLimit);
    const partyLimit = Number.isFinite(partyLimitRaw) ? Math.min(12, Math.max(1, Math.round(partyLimitRaw))) : 2;
    const plusOneAllowed = req.body?.plusOneAllowed === true;
    const id = guestId();
    const code = readableCode();
    const linkToken = randomBytes(24).toString('base64url');
    const record = { id, name, partyLimit, plusOneAllowed, codeHash: hashCode(code), linkHash: hashToken(linkToken) };
    if (!await createAddedGuest(record, MAX_GUESTS)) {
      return res.status(409).json(jsonError('too_many', 'La lista alcanzó su límite.'));
    }
    return res.status(201).json({ guest: { id, name, partyLimit, plusOneAllowed, editable: true }, code, linkToken });
  } catch {
    return res.status(503).json(jsonError('store_unavailable', 'La lista de invitados no está disponible. Inténtalo de nuevo.'));
  }
}
