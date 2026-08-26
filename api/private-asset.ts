import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { readSession, type ApiRequest } from './_security.js';

/**
 * Serves the couple's artwork, and only to a signed-in guest.
 *
 * On Cloudflare the worker holds these bytes and gates them; Vercel has no
 * worker, so without this the wordmark would have to sit in public/ and the
 * gate would stop meaning anything. vercel.json rewrites /private-assets/* here.
 */
const FILES: Record<string, string> = {
  'wordmark.webp': '../worker/private-assets/wordmark.webp',
  'wordmark-450.webp': '../worker/private-assets/wordmark-450.webp',
};

interface AssetResponse {
  setHeader(name: string, value: string): void;
  status(code: number): AssetResponse;
  json(value: unknown): void;
  send(value: Buffer): void;
  end(): void;
}

export default async function handler(
  req: ApiRequest & { query?: Record<string, string | string[] | undefined> },
  res: AssetResponse,
) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (!readSession(req)) return res.status(404).end();

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
