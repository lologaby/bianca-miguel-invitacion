import { jsonError, type ApiRequest, type ApiResponse } from './_security.js';

export default function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json(jsonError('method_not_allowed', 'Método no permitido.'));
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (typeof origin !== 'string' || new URL(origin).host !== req.headers.host) {
        return res.status(403).json(jsonError('invalid_request', 'Solicitud no válida.'));
      }
    } catch {
      return res.status(403).json(jsonError('invalid_request', 'Solicitud no válida.'));
    }
  }
  const secure = process.env.VERCEL_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `bianca_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`);
  return res.status(200).json({ ok: true });
}
