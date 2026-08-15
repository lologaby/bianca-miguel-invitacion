import { createHash, randomBytes } from 'node:crypto';

const baseUrl = process.argv[2];
if (!baseUrl) {
  console.error('Uso: node scripts/generate-invite-link.mjs https://tu-dominio.com/');
  process.exit(1);
}

const token = randomBytes(24).toString('base64url');
const linkHash = createHash('sha256').update(token).digest('hex');
const url = new URL(baseUrl);
url.searchParams.set('invite', token);

console.log(`Enlace personal: ${url.toString()}`);
console.log(`linkHash para GUESTS_JSON: ${linkHash}`);
