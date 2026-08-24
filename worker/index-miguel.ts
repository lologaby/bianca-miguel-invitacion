import { rsvpSchema } from '../db/schema';
import type { Guest, InvitationPayload, PrivateEvent } from '../src/types/invitation';
import wordmarkDataUrl from './private-assets/wordmark.webp?inline';
import wordmarkMobileDataUrl from './private-assets/wordmark-450.webp?inline';
import {
  clearFailedAccess,
  ensureGuestAuthTables,
  guestSessionCookie,
  isAccessRateLimited,
  issueGuestSession,
  recordFailedAccess,
  safeTokenEqual,
  sessionGuestId,
} from './auth';

interface Env {
  DB: D1Database;
  PREVIEW_GUEST_CODE?: string;
  PREVIEW_LINK_TOKEN?: string;
  PRIVATE_GUESTS_JSON?: string;
  SESSION_SECRET?: string;
  ADMIN_PASSWORD?: string;
}

interface PrivateGuestRecord extends Guest {
  id: string;
  codeHash?: string;
  linkHash?: string;
}

interface GuestCredentialBody {
  code?: unknown;
  linkToken?: unknown;
}

interface AdminAttemptRow {
  failures: number;
  window_started_at: number;
}

interface StoredRsvpRow {
  guest_id: string;
  guest_name: string;
  attendance: 'yes' | 'no';
  party_size: number;
  plus_one_name: string;
  song: string;
  updated_at: string;
}

const sha256Pattern = /^[0-9a-f]{64}$/;
const guestIdPattern = /^[a-zA-Z0-9_-]{1,80}$/;
const adminCookieName = 'bianca_admin';
const adminSessionSeconds = 8 * 60 * 60;
const adminAttemptWindowMs = 15 * 60 * 1000;
const adminMaxFailures = 8;
const adminAccessAttemptSchema = `
CREATE TABLE IF NOT EXISTS admin_access_attempts (
  fingerprint TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  window_started_at INTEGER NOT NULL
)
`;

function decodeDataUrl(dataUrl: string) {
  const separator = dataUrl.indexOf(',');
  if (separator < 0) throw new Error('invalid_private_asset');
  const binary = atob(dataUrl.slice(separator + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

const privateBrandAssets = new Map([
  ['/private-assets/wordmark.webp', { contentType: 'image/webp', body: decodeDataUrl(wordmarkDataUrl) }],
  ['/private-assets/wordmark-450.webp', { contentType: 'image/webp', body: decodeDataUrl(wordmarkMobileDataUrl) }],
]);

const previewGuest: PrivateGuestRecord = {
  id: 'preview-guest',
  name: 'María Rodríguez',
  partyLimit: 2,
  plusOneAllowed: true,
  companionNames: ['Acompañante invitado'],
};

const privateEvent: PrivateEvent = {
    couple: { first: 'Bianca', second: 'Miguel' },
    dateLabel: '26 de diciembre',
    dateShort: '26 · DICIEMBRE',
    start: '2026-12-26T16:00:00-04:00',
    end: '2026-12-27T02:00:00-04:00',
    timezone: 'America/Puerto_Rico',
    timeLabel: '4:00 p. m.',
    ceremony: {
      name: 'Iglesia Cristiana Discípulos de Cristo en Ponce',
      city: 'Ponce, Puerto Rico',
      timeLabel: '4:00 p. m.',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Iglesia+Cristiana+Discipulos+de+Cristo+Ponce',
    },
    reception: {
      name: 'Bodega de Méndez',
      note: 'Ponce, Puerto Rico',
      city: 'Ponce, Puerto Rico',
      timeLabel: '6:00 p. m.',
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Bodega+de+Mendez+Ponce+Puerto+Rico',
      moments: ['Cóctel de bienvenida', 'Cata de vino y chocolates', 'Cena y compartir'],
    },
    dressCode: {
      label: 'Cóctel / Formal',
      note: 'No hay colores reservados. Puede elegir el color que prefiera dentro del código Cóctel / Formal.',
    },
    gifts: {
      heading: 'Si desea hacernos un regalo',
      message: 'Puede entregarlo en efectivo o enviarlo por ATH Móvil.',
      athMovil: '787-410-5571',
    },
    faq: [
      {
        id: 'companions',
        q: '¿Puedo llevar acompañantes?',
        a: 'Su invitación indica cuántas personas de su núcleo familiar están incluidas. Por capacidad, solo podremos recibir ese número.',
      },
      {
        id: 'attire-colors',
        q: '¿Hay colores específicos para la vestimenta?',
        a: 'No hay colores reservados. La recepción será en una bodega con iluminación tenue; puede elegir el color que prefiera dentro del código Cóctel / Formal.',
      },
      {
        id: 'indoor-spaces',
        q: '¿La ceremonia y la recepción serán en espacios bajo techo?',
        a: 'Sí. La ceremonia y la recepción serán en interiores con aire acondicionado.',
      },
      {
        id: 'rsvp-deadline',
        q: '¿Hasta cuándo tengo para confirmar mi asistencia?',
        a: 'La fecha límite para confirmar es el 15 de octubre de 2026.',
      },
      {
        id: 'parking',
        q: '¿Habrá estacionamiento disponible?',
        a: 'La iglesia tiene estacionamiento. En Bodega de Méndez los espacios son limitados; también puede estacionarse en las calles cercanas. Le recomendamos llegar con tiempo.',
      },
      {
        id: 'drinks',
        q: '¿Habrá bebidas alcohólicas y opciones sin alcohol?',
        a: 'La recepción incluye bebidas alcohólicas y opciones sin alcohol. Habrá cash bar para compras adicionales.',
      },
    ],
    story: {
      paragraphs: [
        'Elegimos Ponce para la boda y Bodega de Méndez para la recepción. Allí tendremos una cata de vino y chocolates antes de la cena.',
      ],
    },
    weatherNote: 'En Ponce, diciembre sigue siendo cálido y húmedo al llegar. La ceremonia y la recepción son en interiores con aire acondicionado; dentro del código Cóctel / Formal, las telas frescas pueden resultarle más cómodas.',
};

function invitationForGuest(guest: PrivateGuestRecord): InvitationPayload {
  const publicGuest: Guest = {
    name: guest.name,
    partyLimit: guest.partyLimit,
    plusOneAllowed: guest.plusOneAllowed,
    companionNames: guest.companionNames ? [...guest.companionNames] : undefined,
  };
  return { guest: publicGuest, event: privateEvent };
}

const cookieName = 'bianca_invitation_session';
function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'no-referrer');
  return new Response(JSON.stringify(data), { ...init, headers });
}

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function readBody(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json')) return null;
  try { return await request.json() as Record<string, unknown>; } catch { return null; }
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

function adminConfiguration(env: Env) {
  const secret = env.SESSION_SECRET ?? '';
  const password = env.ADMIN_PASSWORD ?? '';
  return secret.length >= 32 && password.length >= 12 ? { secret, password } : null;
}

async function hmacBytes(secret: string, value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

function safeBytesEqual(left: Uint8Array, right: Uint8Array) {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(value: string) {
  if (!/^[a-zA-Z0-9_-]+$/u.test(value)) return null;
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
  try {
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function readCookie(request: Request, name: string) {
  const prefix = `${name}=`;
  return (request.headers.get('cookie') ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length) ?? null;
}

async function validAdminPassword(value: unknown, env: Env) {
  const configuration = adminConfiguration(env);
  if (!configuration) return false;
  const submitted = typeof value === 'string' ? value : '';
  const [actual, expected] = await Promise.all([
    hmacBytes(configuration.secret, submitted),
    hmacBytes(configuration.secret, configuration.password),
  ]);
  return typeof value === 'string' && safeBytesEqual(actual, expected);
}

async function issueAdminToken(env: Env) {
  const configuration = adminConfiguration(env);
  if (!configuration) return null;
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({
    scope: 'rsvp-admin',
    exp: Date.now() + adminSessionSeconds * 1000,
  })));
  const signature = bytesToBase64Url(await hmacBytes(configuration.secret, payload));
  return `${payload}.${signature}`;
}

async function isAdminRequest(request: Request, env: Env) {
  const configuration = adminConfiguration(env);
  const token = readCookie(request, adminCookieName);
  if (!configuration || !token) return false;
  const [payload, providedSignature, extra] = token.split('.');
  if (!payload || !providedSignature || extra) return false;

  const signature = base64UrlToBytes(providedSignature);
  const payloadBytes = base64UrlToBytes(payload);
  if (!signature || !payloadBytes) return false;
  const expectedSignature = await hmacBytes(configuration.secret, payload);
  if (!safeBytesEqual(signature, expectedSignature)) return false;

  try {
    const value = JSON.parse(new TextDecoder().decode(payloadBytes)) as { scope?: unknown; exp?: unknown };
    return value.scope === 'rsvp-admin' && typeof value.exp === 'number' && value.exp > Date.now();
  } catch {
    return false;
  }
}

function adminSessionCookie(token: string) {
  return `${adminCookieName}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${adminSessionSeconds}`;
}

function clearAdminSessionCookie() {
  return `${adminCookieName}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

async function adminFingerprint(request: Request) {
  const forwarded = request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown';
  const userAgent = request.headers.get('user-agent') ?? 'unknown';
  return sha256Hex(`admin|${forwarded}|${userAgent}`);
}

async function ensureAdminAttemptTable(db: D1Database) {
  await db.prepare(adminAccessAttemptSchema).run();
}

async function isAdminRateLimited(request: Request, db: D1Database) {
  const fingerprint = await adminFingerprint(request);
  const row = await db.prepare('SELECT failures, window_started_at FROM admin_access_attempts WHERE fingerprint = ?')
    .bind(fingerprint)
    .first<AdminAttemptRow>();
  return Boolean(row && Date.now() - row.window_started_at <= adminAttemptWindowMs && row.failures >= adminMaxFailures);
}

async function recordAdminFailure(request: Request, db: D1Database) {
  const fingerprint = await adminFingerprint(request);
  const now = Date.now();
  const row = await db.prepare('SELECT failures, window_started_at FROM admin_access_attempts WHERE fingerprint = ?')
    .bind(fingerprint)
    .first<AdminAttemptRow>();
  if (!row || now - row.window_started_at > adminAttemptWindowMs) {
    await db.prepare('INSERT INTO admin_access_attempts (fingerprint, failures, window_started_at) VALUES (?, 1, ?) ON CONFLICT(fingerprint) DO UPDATE SET failures = 1, window_started_at = excluded.window_started_at')
      .bind(fingerprint, now)
      .run();
    return;
  }
  await db.prepare('UPDATE admin_access_attempts SET failures = failures + 1 WHERE fingerprint = ?')
    .bind(fingerprint)
    .run();
}

async function clearAdminFailures(request: Request, db: D1Database) {
  const fingerprint = await adminFingerprint(request);
  await db.prepare('DELETE FROM admin_access_attempts WHERE fingerprint = ?').bind(fingerprint).run();
}

async function adminRsvpRecords(env: Env) {
  await env.DB.prepare(rsvpSchema).run();
  const result = await env.DB.prepare('SELECT guest_id, guest_name, attendance, party_size, plus_one_name, song, updated_at FROM rsvps ORDER BY updated_at DESC')
    .all<StoredRsvpRow>();
  const responses = new Map(result.results.map((row) => [row.guest_id, row]));
  const configuredGuests = privateGuestDirectory(env);
  const guests = configuredGuests.length
    ? configuredGuests
    : (env.PREVIEW_GUEST_CODE || env.PREVIEW_LINK_TOKEN ? [previewGuest] : []);
  const records = guests.map((guest) => {
    const response = responses.get(guest.id);
    return {
      guestId: guest.id,
      name: guest.name,
      invited: guest.partyLimit,
      attendance: response?.attendance ?? 'pending',
      partySize: response?.party_size ?? 0,
      plusOneName: response?.plus_one_name ?? '',
      song: response?.song ?? '',
      updatedAt: response?.updated_at ?? '',
    };
  });

  const knownGuestIds = new Set(records.map((record) => record.guestId));
  for (const response of result.results) {
    if (knownGuestIds.has(response.guest_id)) continue;
    records.push({
      guestId: response.guest_id,
      name: response.guest_name,
      invited: Math.max(1, response.party_size),
      attendance: response.attendance,
      partySize: response.party_size,
      plusOneName: response.plus_one_name,
      song: response.song,
      updatedAt: response.updated_at,
    });
  }
  return records;
}

let cachedGuestDirectorySource: string | null = null;
let cachedGuestDirectory: PrivateGuestRecord[] = [];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalHash(value: unknown) {
  const hash = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return sha256Pattern.test(hash) ? hash : undefined;
}

function privateGuestDirectory(env: Env) {
  const source = env.PRIVATE_GUESTS_JSON?.trim() || '';
  if (source === cachedGuestDirectorySource) return cachedGuestDirectory;

  cachedGuestDirectorySource = source;
  cachedGuestDirectory = [];
  if (!source) return cachedGuestDirectory;

  try {
    const parsed = JSON.parse(source) as unknown;
    if (!Array.isArray(parsed)) return cachedGuestDirectory;

    const ids = new Set<string>();
    for (const item of parsed) {
      if (!isRecord(item)) continue;

      const id = typeof item.id === 'string' ? item.id.trim() : '';
      const name = typeof item.name === 'string' ? item.name.trim().slice(0, 160) : '';
      const partyLimit = Number(item.partyLimit);
      const plusOneAllowed = item.plusOneAllowed;
      const codeHash = optionalHash(item.codeHash);
      const linkHash = optionalHash(item.linkHash);
      if (
        !guestIdPattern.test(id)
        || id === previewGuest.id
        || ids.has(id)
        || !name
        || !Number.isInteger(partyLimit)
        || partyLimit < 1
        || partyLimit > 20
        || typeof plusOneAllowed !== 'boolean'
        || (!codeHash && !linkHash)
      ) continue;

      const companionNames = Array.isArray(item.companionNames)
        ? item.companionNames
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim().slice(0, 160))
          .filter(Boolean)
          .slice(0, 20)
        : undefined;

      ids.add(id);
      cachedGuestDirectory.push({
        id,
        name,
        partyLimit,
        plusOneAllowed,
        companionNames,
        codeHash,
        linkHash,
      });
    }
  } catch {
    // A malformed secret disables directory authentication without exposing details.
  }

  return cachedGuestDirectory;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function privateGuestForCredentials(body: GuestCredentialBody | null, env: Env) {
  if (!body) return null;
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase().slice(0, 128) : '';
  const linkToken = typeof body.linkToken === 'string' ? body.linkToken.trim().slice(0, 256) : '';
  if (!code && !linkToken) return null;

  const [codeHash, linkHash] = await Promise.all([
    code ? sha256Hex(code) : Promise.resolve(''),
    linkToken ? sha256Hex(linkToken) : Promise.resolve(''),
  ]);
  const directory = privateGuestDirectory(env);
  const matches = await Promise.all(directory.map(async (guest) => {
    const [validCode, validLink] = await Promise.all([
      codeHash && guest.codeHash
        ? safeTokenEqual(codeHash, guest.codeHash, (value) => value.trim().toLowerCase())
        : Promise.resolve(false),
      linkHash && guest.linkHash
        ? safeTokenEqual(linkHash, guest.linkHash, (value) => value.trim().toLowerCase())
        : Promise.resolve(false),
    ]);
    return validCode || validLink;
  }));

  const matchIndex = matches.findIndex(Boolean);
  return matchIndex >= 0 ? directory[matchIndex] : null;
}

async function previewGuestForCredentials(body: GuestCredentialBody | null, env: Env) {
  if (!body) return null;
  const previewCode = env.PREVIEW_GUEST_CODE?.trim();
  const previewLink = env.PREVIEW_LINK_TOKEN?.trim();
  const [validCode, validLink] = await Promise.all([
    previewCode ? safeTokenEqual(body.code, previewCode, (value) => value.trim().toUpperCase()) : Promise.resolve(false),
    previewLink ? safeTokenEqual(body.linkToken, previewLink, (value) => value.trim()) : Promise.resolve(false),
  ]);
  return validCode || validLink ? previewGuest : null;
}

async function guestForCredentials(body: GuestCredentialBody | null, env: Env) {
  return await privateGuestForCredentials(body, env) ?? await previewGuestForCredentials(body, env);
}

function guestForId(id: string, env: Env) {
  if (id === previewGuest.id) return previewGuest;
  return privateGuestDirectory(env).find((guest) => guest.id === id) ?? null;
}

async function authenticatedGuest(request: Request, env: Env) {
  await ensureGuestAuthTables(env.DB);
  const id = await sessionGuestId(request, env.DB, cookieName);
  return id ? guestForId(id, env) : null;
}

async function isAuthorized(request: Request, env: Env) {
  return Boolean(await authenticatedGuest(request, env));
}

function privateNotFound() {
  return new Response(null, {
    status: 404,
    headers: {
      'cache-control': 'private, no-store',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
    },
  });
}

async function privateAsset(request: Request, env: Env) {
  if ((request.method !== 'GET' && request.method !== 'HEAD') || !(await isAuthorized(request, env))) return privateNotFound();

  const asset = privateBrandAssets.get(new URL(request.url).pathname);
  if (!asset) return privateNotFound();

  const headers = new Headers();
  headers.set('content-type', asset.contentType);
  headers.set('content-length', String(asset.body.byteLength));
  headers.set('cache-control', 'private, no-store');
  headers.set('cross-origin-resource-policy', 'same-origin');
  headers.set('referrer-policy', 'no-referrer');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(request.method === 'HEAD' ? null : asset.body, {
    status: 200,
    headers,
  });
}

async function api(request: Request, env: Env) {
  const url = new URL(request.url);

  if (url.pathname === '/api/admin-login' && request.method === 'POST') {
    if (!isSameOrigin(request)) return json({ error: 'invalid_request' }, { status: 403 });
    if (!adminConfiguration(env)) return json({ error: 'not_configured' }, { status: 503 });
    await ensureAdminAttemptTable(env.DB);
    if (await isAdminRateLimited(request, env.DB)) {
      return json({ error: 'try_later' }, { status: 429 });
    }

    const body = await readBody(request);
    if (!body || !(await validAdminPassword(body.password, env))) {
      await recordAdminFailure(request, env.DB);
      return json({ error: 'invalid_credentials' }, { status: 401 });
    }

    await clearAdminFailures(request, env.DB);
    const token = await issueAdminToken(env);
    if (!token) return json({ error: 'not_configured' }, { status: 503 });
    return json({ ok: true }, { headers: { 'set-cookie': adminSessionCookie(token) } });
  }

  if (url.pathname === '/api/admin-rsvps' && request.method === 'GET') {
    if (!(await isAdminRequest(request, env))) {
      return json({ error: 'unauthorized' }, { status: 401 });
    }
    return json({ records: await adminRsvpRecords(env) });
  }

  if (url.pathname === '/api/admin-logout' && request.method === 'POST') {
    if (!isSameOrigin(request)) return json({ error: 'invalid_request' }, { status: 403 });
    return json(
      { ok: true },
      { headers: { 'set-cookie': clearAdminSessionCookie() } },
    );
  }

  if (url.pathname === '/api/guest' && request.method === 'POST') {
    if (!isSameOrigin(request)) return json({ error: 'invalid_invitation' }, { status: 403 });
    await ensureGuestAuthTables(env.DB);
    if (await isAccessRateLimited(request, env.DB)) return json({ error: 'try_later' }, { status: 429 });

    const body = await readBody(request);
    const guest = await guestForCredentials(body, env);
    if (!guest) {
      await recordFailedAccess(request, env.DB);
      return json({ error: 'invalid_invitation' }, { status: 401 });
    }

    await clearFailedAccess(request, env.DB);
    const sessionId = await issueGuestSession(env.DB, guest.id);
    return json(invitationForGuest(guest), { headers: { 'set-cookie': guestSessionCookie(cookieName, sessionId) } });
  }

  if (url.pathname === '/api/session' && request.method === 'GET') {
    const guest = await authenticatedGuest(request, env);
    return guest
      ? json(invitationForGuest(guest))
      : new Response(null, {
        status: 204,
        headers: {
          'cache-control': 'no-store',
          'referrer-policy': 'no-referrer',
          'x-content-type-options': 'nosniff',
        },
      });
  }

  if (url.pathname === '/api/rsvp' && request.method === 'POST') {
    if (!isSameOrigin(request)) return json({ error: 'unauthorized' }, { status: 401 });
    const guest = await authenticatedGuest(request, env);
    if (!guest) return json({ error: 'unauthorized' }, { status: 401 });
    const body = await readBody(request);
    if (!body || (body.attendance !== 'yes' && body.attendance !== 'no')) return json({ error: 'invalid_attendance' }, { status: 400 });
    const partySize = body.attendance === 'yes' ? Number(body.partySize) : 0;
    if (
      !Number.isInteger(partySize)
      || partySize > guest.partyLimit
      || (body.attendance === 'yes' && partySize < 1)
    ) return json({ error: 'invalid_party_size' }, { status: 400 });
    await env.DB.prepare(rsvpSchema).run();
    await env.DB.prepare(`INSERT INTO rsvps (guest_id, guest_name, attendance, party_size, plus_one_name, song, dietary, accessibility, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(guest_id) DO UPDATE SET attendance = excluded.attendance, party_size = excluded.party_size, plus_one_name = excluded.plus_one_name, song = excluded.song, dietary = excluded.dietary, accessibility = excluded.accessibility, updated_at = excluded.updated_at`)
      .bind(guest.id, guest.name, body.attendance, partySize, clean(body.plusOneName, 80), clean(body.song, 120), clean(body.dietary, 300), clean(body.accessibility, 300), new Date().toISOString())
      .run();
    return json({ ok: true });
  }

  return json({ error: 'not_found' }, { status: 404 });
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/private-assets/')) return privateAsset(request, env);
    if (url.pathname.startsWith('/api/')) return api(request, env);
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
