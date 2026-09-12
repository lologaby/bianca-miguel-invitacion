import { allGuests } from './_guests-store.js';
import { readSession, type ApiRequest } from './_security.js';

/** A signed cookie identifies a guest; the current list grants access. */
export async function activeGuest(req: ApiRequest) {
  const session = readSession(req);
  if (!session) return null;
  return (await allGuests()).find((guest) => guest.id === session.id) ?? null;
}
