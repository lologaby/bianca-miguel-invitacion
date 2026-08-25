/**
 * Builds a GUESTS_JSON entry for one invitation.
 *
 * The site never stores a code, only its SHA-256. This prints the code to hand
 * to the guest and the record to paste into the host's GUESTS_JSON — keep them
 * apart, and never commit the code.
 *
 * Run:
 *   node scripts/generate-guest.mjs "María Rodríguez" 2
 *   node scripts/generate-guest.mjs "María Rodríguez" 2 --code MARIA-2026
 *   node scripts/generate-guest.mjs "María Rodríguez" 2 --link https://tu-dominio.com/
 *
 * The worker upper-cases and trims before hashing, so the code is not
 * case-sensitive for the guest.
 */
import { createHash, randomBytes, randomInt } from 'node:crypto';

const args = process.argv.slice(2);
const name = args[0];
const partyLimit = Number(args[1] ?? 2);

if (!name || !Number.isFinite(partyLimit)) {
  console.error('Uso: node scripts/generate-guest.mjs "Nombre del invitado" 2 [--code CODIGO] [--link https://dominio/]');
  process.exit(1);
}

const flag = (n) => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1] ?? true; };

/* Letters that cannot be misread aloud or in handwriting: no O/0, I/1, S/5. */
const ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789';
const readableCode = () =>
  ['', ''].map(() => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')).join('-');

const code = String(flag('--code') || readableCode()).trim().toUpperCase();
const sha = (value) => createHash('sha256').update(value).digest('hex');

const record = {
  id: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  name,
  partyLimit,
  plusOneAllowed: partyLimit > 1,
  codeHash: sha(code),
};

const linkBase = flag('--link');
let inviteUrl = null;
if (typeof linkBase === 'string') {
  const token = randomBytes(24).toString('base64url');
  record.linkHash = sha(token);
  const url = new URL(linkBase);
  url.searchParams.set('invite', token);
  inviteUrl = url.toString();
}

console.log('\n— Para el invitado —');
console.log(`  Código: ${code}`);
if (inviteUrl) console.log(`  Enlace: ${inviteUrl}`);
console.log('\n— Para GUESTS_JSON en el hosting —');
console.log(JSON.stringify(record, null, 2));
console.log('\nGUESTS_JSON es un array; añada este objeto a los que ya existan.');
console.log('No guarde el código ni el enlace en el repositorio.\n');
