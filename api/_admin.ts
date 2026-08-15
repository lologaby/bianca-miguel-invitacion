import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ApiRequest } from './_security.js';

function sessionSecret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('SESSION_SECRET is missing or too short');
  return value;
}

export function validAdminPassword(value: unknown) {
  const expectedValue = process.env.ADMIN_PASSWORD;
  if (!expectedValue || expectedValue.length < 12 || typeof value !== 'string') return false;
  const expected = createHmac('sha256', sessionSecret()).update(expectedValue).digest();
  const actual = createHmac('sha256', sessionSecret()).update(value).digest();
  return timingSafeEqual(expected, actual);
}

export function signAdminSession() {
  const payload = Buffer.from(JSON.stringify({ scope: 'rsvp-admin', exp: Date.now() + 28800000 })).toString('base64url');
  const signature = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function isAdmin(req: ApiRequest) {
  const raw = req.cookies.bianca_admin;
  if (!raw) return false;
  const [payload, provided] = raw.split('.');
  if (!payload || !provided) return false;
  const expected = createHmac('sha256', sessionSecret()).update(payload).digest();
  const actual = Buffer.from(provided, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { scope?: string; exp?: number };
    return value.scope === 'rsvp-admin' && typeof value.exp === 'number' && value.exp > Date.now();
  } catch {
    return false;
  }
}
