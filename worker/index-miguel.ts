import { rsvpSchema } from '../db/schema';
import type { InvitationPayload } from '../src/types/invitation';
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

interface Env { DB: D1Database; }

const guestId = 'preview-guest';
const invitation: InvitationPayload = {
  guest: { name: 'Invitado de prueba', partyLimit: 2, plusOneAllowed: true, companionNames: ['Acompañante invitado'] },
  event: {
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
      note: 'Una noche elegante y cuidada, pensada para celebrar con comodidad.',
    },
    gifts: {
      message: 'Si desean tener un detalle adicional con nosotros, lo recibiremos con mucho cariño en efectivo o a través de ATH Móvil.',
      athMovil: '787-410-5571',
    },
  },
};

const cookieName = 'bianca_invitation_session';
const previewCode = 'INVITACION-DEMO';
const previewLink = 'bianca-preview-2026';

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

async function isAuthorized(request: Request, env: Env) {
  await ensureGuestAuthTables(env.DB);
  return await sessionGuestId(request, env.DB, cookieName) === guestId;
}

async function api(request: Request, env: Env) {
  const url = new URL(request.url);

  if (url.pathname === '/api/guest' && request.method === 'POST') {
    if (!isSameOrigin(request)) return json({ error: 'invalid_invitation' }, { status: 403 });
    await ensureGuestAuthTables(env.DB);
    if (await isAccessRateLimited(request, env.DB)) return json({ error: 'try_later' }, { status: 429 });

    const body = await readBody(request);
    const [validCode, validLink] = await Promise.all([
      safeTokenEqual(body?.code, previewCode, (value) => value.trim().toUpperCase()),
      safeTokenEqual(body?.linkToken, previewLink, (value) => value.trim()),
    ]);
    if (!body || (!validCode && !validLink)) {
      await recordFailedAccess(request, env.DB);
      return json({ error: 'invalid_invitation' }, { status: 401 });
    }

    await clearFailedAccess(request, env.DB);
    const sessionId = await issueGuestSession(env.DB, guestId);
    return json(invitation, { headers: { 'set-cookie': guestSessionCookie(cookieName, sessionId) } });
  }

  if (url.pathname === '/api/session' && request.method === 'GET') {
    return await isAuthorized(request, env)
      ? json(invitation)
      : json({ error: 'unauthorized' }, { status: 401 });
  }

  if (url.pathname === '/api/rsvp' && request.method === 'POST') {
    if (!isSameOrigin(request) || !(await isAuthorized(request, env))) return json({ error: 'unauthorized' }, { status: 401 });
    const body = await readBody(request);
    if (!body || (body.attendance !== 'yes' && body.attendance !== 'no')) return json({ error: 'invalid_attendance' }, { status: 400 });
    const partySize = body.attendance === 'yes' ? Number(body.partySize) : 0;
    if (!Number.isInteger(partySize) || partySize < 0 || partySize > invitation.guest.partyLimit) return json({ error: 'invalid_party_size' }, { status: 400 });
    await env.DB.prepare(rsvpSchema).run();
    await env.DB.prepare(`INSERT INTO rsvps (guest_id, guest_name, attendance, party_size, plus_one_name, song, dietary, accessibility, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(guest_id) DO UPDATE SET attendance = excluded.attendance, party_size = excluded.party_size, plus_one_name = excluded.plus_one_name, song = excluded.song, dietary = excluded.dietary, accessibility = excluded.accessibility, updated_at = excluded.updated_at`)
      .bind(guestId, invitation.guest.name, body.attendance, partySize, clean(body.plusOneName, 80), clean(body.song, 120), clean(body.dietary, 300), clean(body.accessibility, 300), new Date().toISOString())
      .run();
    return json({ ok: true });
  }

  return json({ error: 'not_found' }, { status: 404 });
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return api(request, env);
    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
