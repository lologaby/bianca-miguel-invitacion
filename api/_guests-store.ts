import { createHash, randomInt } from 'node:crypto';
import { redis } from './_redis.js';
import { readGuests, type GuestRecord } from './_data.js';

/*
 * Guests come from two places.
 *
 * GUESTS_JSON is the seed list on the host, set by hand. It cannot be written
 * at runtime — an environment variable is read-only to the running function —
 * so anyone added from the coordination portal is stored in Redis instead, and
 * the two are merged everywhere a guest is looked up.
 *
 * Only the SHA-256 of a code is ever stored. The code itself is shown once, at
 * the moment it is created, and cannot be recovered afterwards: to give someone
 * their code again, issue a new one.
 */
const KEY = 'guests:bianca-placeholder-2026';

export async function addedGuests(): Promise<GuestRecord[]> {
  try {
    return (await redis.get<GuestRecord[]>(KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function allGuests(): Promise<GuestRecord[]> {
  let seed: GuestRecord[] = [];
  try { seed = readGuests(); } catch { seed = []; }
  const added = await addedGuests();
  const seen = new Set(seed.map((guest) => guest.id));
  return [...seed, ...added.filter((guest) => !seen.has(guest.id))];
}

export async function saveAddedGuests(list: GuestRecord[]) {
  await redis.set(KEY, list);
}

/* Letters that cannot be misread aloud or in handwriting: no O/0, I/1, S/5. */
const ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789';

export function readableCode() {
  const block = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return `${block()}-${block()}`;
}

/*
 * Both servers strip everything that is not a letter or a digit before hashing,
 * so the hash is of the stripped form. The dashes exist only to make the code
 * readable; they are not part of the secret.
 */
export const hashCode = (code: string) =>
  createHash('sha256').update(code.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function guestId(name: string, taken: Set<string>) {
  const base = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'invitado';
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}
