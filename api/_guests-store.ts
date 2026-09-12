import { createHash, randomInt, randomUUID } from 'node:crypto';
import { redis } from './_redis.js';
import { readGuests, type GuestRecord } from './_data.js';

/* Keep the original JSON keys and shape, including the host's seed list. */
const KEY = 'guests:bianca-placeholder-2026';
const REMOVED_KEY = 'guests:removed:bianca-placeholder-2026';

function guestList(value: unknown): GuestRecord[] {
  if (value === null) return [];
  if (!Array.isArray(value) || value.some((guest) => !guest || typeof guest.id !== 'string'
    || typeof guest.name !== 'string' || typeof guest.codeHash !== 'string'
    || !Number.isInteger(guest.partyLimit) || guest.partyLimit < 1
    || typeof guest.plusOneAllowed !== 'boolean')) throw new Error('Invalid guest list');
  return value;
}

export async function removedIds(): Promise<string[]> {
  const value = await redis.get<unknown>(REMOVED_KEY);
  if (value === null) return [];
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string')) throw new Error('Invalid removed guest list');
  return value;
}

export async function addedGuests(): Promise<GuestRecord[]> {
  return guestList(await redis.get<unknown>(KEY));
}

export async function allGuests(): Promise<GuestRecord[]> {
  // A failed read must not resurrect removed invitations or pretend the list is empty.
  const seed = guestList(readGuests());
  const added = await addedGuests();
  const gone = new Set(await removedIds());
  const seen = new Set(seed.map((guest) => guest.id));
  return [...seed, ...added.filter((guest) => !seen.has(guest.id))]
    .filter((guest) => !gone.has(guest.id));
}

/* Redis executes each script atomically. Updating the existing JSON in one
 * command prevents two tabs from overwriting one another's additions/removals. */
const APPEND_GUEST = `
-- append-guest-v1
local raw = redis.call('GET', KEYS[1])
if raw and not string.match(raw, '^%s*%[') then return redis.error_reply('Invalid guest list') end
local guests = raw and cjson.decode(raw) or {}
for _, guest in ipairs(guests) do
  if type(guest) ~= 'table' or type(guest.id) ~= 'string' then return redis.error_reply('Invalid guest list') end
end
if #guests >= tonumber(ARGV[2]) then return 0 end
table.insert(guests, cjson.decode(ARGV[1]))
redis.call('SET', KEYS[1], cjson.encode(guests))
return 1
`;

const REMOVE_GUEST = `
-- remove-guest-v1
local raw = redis.call('GET', KEYS[1])
local rawRemoved = redis.call('GET', KEYS[2])
if raw and not string.match(raw, '^%s*%[') then return redis.error_reply('Invalid guest list') end
if rawRemoved and not string.match(rawRemoved, '^%s*%[') then return redis.error_reply('Invalid removed guest list') end
local guests = raw and cjson.decode(raw) or {}
local removed = rawRemoved and cjson.decode(rawRemoved) or {}
local remaining = {}
local found = false
for _, guest in ipairs(guests) do
  if type(guest) ~= 'table' or type(guest.id) ~= 'string' then return redis.error_reply('Invalid guest list') end
  if guest.id == ARGV[1] then found = true else table.insert(remaining, guest) end
end
local alreadyRemoved = false
for _, id in ipairs(removed) do
  if type(id) ~= 'string' then return redis.error_reply('Invalid removed guest list') end
  if id == ARGV[1] then alreadyRemoved = true end
end
if ARGV[2] == '1' and not alreadyRemoved then
  table.insert(removed, ARGV[1])
  found = true
end
if not found then return 0 end
if #remaining ~= #guests then
  redis.call('SET', KEYS[1], #remaining == 0 and '[]' or cjson.encode(remaining))
end
if ARGV[2] == '1' and not alreadyRemoved then redis.call('SET', KEYS[2], cjson.encode(removed)) end
return 1
`;

export async function createAddedGuest(guest: GuestRecord, maximum: number) {
  return await redis.eval(APPEND_GUEST, [KEY], [JSON.stringify(guest), String(maximum)]) === 1;
}

export async function removeGuest(id: string) {
  const isSeed = guestList(readGuests()).some((guest) => guest.id === id);
  return await redis.eval(REMOVE_GUEST, [KEY, REMOVED_KEY], [id, isSeed ? '1' : '0']) === 1;
}

/* Letters that cannot be misread aloud or in handwriting: no O/0, I/1, S/5. */
const ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789';

export function readableCode() {
  const block = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return `${block()}-${block()}`;
}

export const hashCode = (code: string) =>
  createHash('sha256').update(code.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

// Never reuse an old RSVP key or allow an old cookie to identify a new invitation.
export const guestId = () => `guest-${randomUUID()}`;
