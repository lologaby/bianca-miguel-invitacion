import {
  guestAccessAttemptSchema,
  guestSessionExpiryIndexSchema,
  guestSessionSchema,
} from '../db/schema';

const SESSION_SECONDS = 8 * 60 * 60;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 8;

interface AttemptRow {
  failures: number;
  window_started_at: number;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function requestFingerprint(request: Request) {
  const forwarded = request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown';
  const userAgent = request.headers.get('user-agent') ?? 'unknown';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${forwarded}|${userAgent}`));
  return bytesToHex(new Uint8Array(digest));
}

function readCookie(request: Request, name: string) {
  const cookie = request.headers.get('cookie') ?? '';
  const prefix = `${name}=`;
  const match = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return match?.slice(prefix.length) ?? null;
}

export async function ensureGuestAuthTables(db: D1Database) {
  await db.batch([
    db.prepare(guestSessionSchema),
    db.prepare(guestSessionExpiryIndexSchema),
    db.prepare(guestAccessAttemptSchema),
  ]);
}

export async function safeTokenEqual(value: unknown, expected: string, normalize: (input: string) => string) {
  const submitted = normalize(typeof value === 'string' ? value : '');
  const target = normalize(expected);
  const [submittedHash, targetHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(submitted)),
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(target)),
  ]);
  const left = new Uint8Array(submittedHash);
  const right = new Uint8Array(targetHash);
  let difference = left.length ^ right.length;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function isAccessRateLimited(request: Request, db: D1Database) {
  const fingerprint = await requestFingerprint(request);
  const row = await db.prepare('SELECT failures, window_started_at FROM guest_access_attempts WHERE fingerprint = ?')
    .bind(fingerprint)
    .first<AttemptRow>();
  if (!row || Date.now() - row.window_started_at > ATTEMPT_WINDOW_MS) return false;
  return row.failures >= MAX_FAILURES;
}

export async function recordFailedAccess(request: Request, db: D1Database) {
  const fingerprint = await requestFingerprint(request);
  const now = Date.now();
  const row = await db.prepare('SELECT failures, window_started_at FROM guest_access_attempts WHERE fingerprint = ?')
    .bind(fingerprint)
    .first<AttemptRow>();
  if (!row || now - row.window_started_at > ATTEMPT_WINDOW_MS) {
    await db.prepare('INSERT INTO guest_access_attempts (fingerprint, failures, window_started_at) VALUES (?, 1, ?) ON CONFLICT(fingerprint) DO UPDATE SET failures = 1, window_started_at = excluded.window_started_at')
      .bind(fingerprint, now)
      .run();
    return;
  }
  await db.prepare('UPDATE guest_access_attempts SET failures = failures + 1 WHERE fingerprint = ?')
    .bind(fingerprint)
    .run();
}

export async function clearFailedAccess(request: Request, db: D1Database) {
  const fingerprint = await requestFingerprint(request);
  await db.prepare('DELETE FROM guest_access_attempts WHERE fingerprint = ?').bind(fingerprint).run();
}

export async function issueGuestSession(db: D1Database, guestId: string) {
  const id = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + SESSION_SECONDS * 1000;
  await db.batch([
    db.prepare('DELETE FROM guest_sessions WHERE expires_at <= ?').bind(now),
    db.prepare('INSERT INTO guest_sessions (id, guest_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .bind(id, guestId, expiresAt, now),
  ]);
  return id;
}

export async function sessionGuestId(request: Request, db: D1Database, cookieName: string) {
  const id = readCookie(request, cookieName);
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const row = await db.prepare('SELECT guest_id FROM guest_sessions WHERE id = ? AND expires_at > ?')
    .bind(id, Date.now())
    .first<{ guest_id: string }>();
  return row?.guest_id ?? null;
}

export function guestSessionCookie(cookieName: string, sessionId: string) {
  return `${cookieName}=${sessionId}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}`;
}
