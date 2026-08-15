import type { PrivateEvent } from '../src/types/invitation.js';

export interface GuestRecord {
  id: string;
  codeHash: string;
  linkHash?: string;
  name: string;
  partyLimit: number;
  plusOneAllowed: boolean;
  companionNames?: string[];
}

export function readGuests(): GuestRecord[] {
  const parsed = JSON.parse(process.env.GUESTS_JSON || '[]') as unknown;
  if (!Array.isArray(parsed)) throw new Error('GUESTS_JSON is not an array');
  return parsed as GuestRecord[];
}

export function readPrivateEvent(): PrivateEvent {
  const parsed = JSON.parse(process.env.PRIVATE_EVENT_JSON || '{}') as PrivateEvent;
  if (!parsed?.couple?.first || !parsed?.start || !parsed?.ceremony?.name) throw new Error('PRIVATE_EVENT_JSON is not configured');
  return parsed;
}

export function publicGuest(record: GuestRecord) {
  return {
    name: record.name,
    partyLimit: record.partyLimit,
    plusOneAllowed: record.plusOneAllowed,
    companionNames: record.companionNames ?? [],
  };
}
