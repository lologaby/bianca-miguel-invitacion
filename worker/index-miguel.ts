import { rsvpSchema } from '../db/schema';
import type { InvitationPayload } from '../src/types/invitation';

interface Env { DB: D1Database; }

const invitation: InvitationPayload = {
  guest: { name: 'Invitado de prueba', partyLimit: 2, plusOneAllowed: true, companionNames: ['Acompañante invitado'] },
  event: {
    couple: { first: 'Bianca', second: 'Miguel' },
    dateLabel: '26 de diciembre',
    dateShort: '26 · DICIEMBRE',
    start: '2026-12-26T17:00:00-04:00',
    end: '2026-12-27T02:00:00-04:00',
    timezone: 'America/Puerto_Rico',
    timeLabel: 'Hora por confirmar',
    ceremony: { name: 'Iglesia Cristiana Discípulos de Cristo', city: 'Ponce, Puerto Rico', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Iglesia+Cristiana+Discipulos+de+Cristo+Ponce' },
    reception: { name: 'Recepción', note: 'Los detalles finales se compartirán con cada invitación.' },
  },
};

const cookieName = 'bianca_preview_session';
const previewCode = 'INVITACION-DEMO';
const previewLink = 'bianca-preview-2026';

function json(data: unknown, init: ResponseInit = {}) { const headers = new Headers(init.headers); headers.set('content-type', 'application/json; charset=utf-8'); headers.set('cache-control', 'no-store'); return new Response(JSON.stringify(data), { ...init, headers }); }
function hasSession(request: Request) { const cookie = request.headers.get('cookie') ?? ''; return cookie.split(';').some((part) => part.trim() === `${cookieName}=accepted`); }
function clean(value: unknown, max: number) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
async function readBody(request: Request) { if (!request.headers.get('content-type')?.includes('application/json')) return null; try { return await request.json() as Record<string, unknown>; } catch { return null; } }

async function api(request: Request, env: Env) {
  const url = new URL(request.url);
  if (url.pathname === '/api/guest' && request.method === 'POST') {
    const body = await readBody(request); const valid = body?.code === previewCode || body?.linkToken === previewLink;
    if (!valid) return json({ error: 'invalid_invitation' }, { status: 401 });
    return json(invitation, { headers: { 'set-cookie': `${cookieName}=accepted; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800` } });
  }
  if (url.pathname === '/api/session' && request.method === 'GET') return hasSession(request) ? json(invitation) : json({ error: 'unauthorized' }, { status: 401 });
  if (url.pathname === '/api/rsvp' && request.method === 'POST') {
    if (!hasSession(request)) return json({ error: 'unauthorized' }, { status: 401 });
    const body = await readBody(request);
    if (!body || (body.attendance !== 'yes' && body.attendance !== 'no')) return json({ error: 'invalid_attendance' }, { status: 400 });
    const partySize = body.attendance === 'yes' ? Number(body.partySize) : 0;
    if (!Number.isInteger(partySize) || partySize < 0 || partySize > invitation.guest.partyLimit) return json({ error: 'invalid_party_size' }, { status: 400 });
    await env.DB.prepare(rsvpSchema).run();
    await env.DB.prepare(`INSERT INTO rsvps (guest_id, guest_name, attendance, party_size, plus_one_name, song, dietary, accessibility, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(guest_id) DO UPDATE SET attendance = excluded.attendance, party_size = excluded.party_size, plus_one_name = excluded.plus_one_name, song = excluded.song, dietary = excluded.dietary, accessibility = excluded.accessibility, updated_at = excluded.updated_at`).bind('preview-guest', invitation.guest.name, body.attendance, partySize, clean(body.plusOneName, 80), clean(body.song, 120), clean(body.dietary, 300), clean(body.accessibility, 300), new Date().toISOString()).run();
    return json({ ok: true });
  }
  return json({ error: 'not_found' }, { status: 404 });
}

export default { async fetch(request: Request, env: Env) { const url = new URL(request.url); if (url.pathname.startsWith('/api/')) return api(request, env); return new Response(null, { status: 404 }); } } satisfies ExportedHandler<Env>;
