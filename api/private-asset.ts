import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { activeGuest } from './_guest-session.js';
import { jsonError, type ApiRequest } from './_security.js';

/** The artwork stays private; Vercel includes these files with the function. */
const FILES: Record<string, string> = {
  'wordmark.webp': '../worker/private-assets/wordmark.webp',
  'wordmark-450.webp': '../worker/private-assets/wordmark-450.webp',
  'wordmark-1350.webp': '../worker/private-assets/wordmark-1350.webp',
};

interface AssetResponse {
  setHeader(name: string, value: string): void;
  status(code: number): AssetResponse;
  json(value: unknown): void;
  send(value: Buffer): void;
  end(): void;
}

export default async function handler(req: ApiRequest, res: AssetResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (!await activeGuest(req)) return res.status(404).end();
  } catch {
    return res.status(503).json(jsonError('store_unavailable', 'La invitación no está disponible. Inténtalo de nuevo.'));
  }
  const name = String(Array.isArray(req.query?.file) ? req.query?.file[0] : req.query?.file ?? '');
  const relative = FILES[name];
  if (!relative) return res.status(404).end();
  try {
    const body = await readFile(fileURLToPath(new URL(relative, import.meta.url)));
    res.setHeader('Content-Type', 'image/webp');
    return res.send(body);
  } catch {
    return res.status(404).end();
  }
}
