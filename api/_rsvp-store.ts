import { redis } from './_redis.js';

export interface SavedRsvp {
  attendance: 'yes' | 'no';
  partySize: number;
  plusOneName: string;
  attendeeNames?: string[];
  updatedAt: string;
}

export interface RsvpRecord extends SavedRsvp {
  event: string;
  guestId: string;
  dietary: string;
  accessibility: string;
  song: string;
}

const keyFor = (guestId: string) => `rsvp:bianca-placeholder-2026:${guestId}`;

function publicRsvp(value: unknown): SavedRsvp {
  const record = value as Partial<SavedRsvp> | null;
  if (!record || (record.attendance !== 'yes' && record.attendance !== 'no')
    || !Number.isInteger(record.partySize) || (record.partySize as number) < 0
    || typeof record.updatedAt !== 'string' || !Number.isFinite(Date.parse(record.updatedAt))
    || (record.plusOneName !== undefined && typeof record.plusOneName !== 'string')
    || (record.attendeeNames !== undefined && (!Array.isArray(record.attendeeNames)
      || record.attendeeNames.length !== (record.attendance === 'yes' ? record.partySize : 0)
      || record.attendeeNames.some((name) => typeof name !== 'string' || !name.trim() || name.length > 80)))) {
    throw new Error('Invalid saved RSVP');
  }
  return {
    attendance: record.attendance,
    partySize: record.partySize as number,
    plusOneName: record.plusOneName ?? '',
    ...(record.attendeeNames !== undefined ? { attendeeNames: record.attendeeNames } : {}),
    updatedAt: record.updatedAt,
  };
}

export async function readSavedRsvp(guestId: string): Promise<SavedRsvp | null> {
  const record = await redis.get<unknown>(keyFor(guestId));
  return record === null ? null : publicRsvp(record);
}

/** The first response wins, including retries from another tab or after a timeout. */
export async function saveRsvpOnce(record: RsvpRecord): Promise<SavedRsvp> {
  if (await redis.setIfAbsent(keyFor(record.guestId), record)) return publicRsvp(record);
  const saved = await readSavedRsvp(record.guestId);
  if (!saved) throw new Error('Saved RSVP unavailable');
  return saved;
}
