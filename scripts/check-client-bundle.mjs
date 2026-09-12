import { readdir, readFile } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';

const directory = resolve(process.argv[2] || 'dist');
async function filesAt(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? filesAt(join(path, entry.name)) : join(path, entry.name)))).flat();
}
const files = await filesAt(directory);
const bundles = files.filter(file => /\.(js|html|css)$/.test(file));
if (!bundles.some(file => file.endsWith('.js'))) throw new Error('No se encontró el bundle del cliente.');
const source = (await Promise.all(bundles.map(file => readFile(file, 'utf8')))).join('\n');
const failures = [];
if ([...source.matchAll(/\b\d{3}-\d{3}-\d{4}\b/g)].some(match => match[0] !== '000-000-0000')) failures.push('Un teléfono distinto del marcador llegó al cliente.');
for (const marker of ['Lugar de ceremonia', 'Lugar de recepción', 'Ciudad, Puerto Rico']) {
  if (!source.includes(marker)) failures.push('Falta un marcador de la invitación ficticia.');
}
if (/@-?\d{1,3}\.\d{3,},-?\d{1,3}\.\d{3,}/.test(source)) failures.push('Hay coordenadas de un lugar en el cliente.');
const previewWordmarks = process.argv.includes('--demo-wordmarks') ? new Set(['private-assets/wordmark.webp', 'private-assets/wordmark-450.webp', 'private-assets/wordmark-1350.webp']) : new Set();
if (files.some(file => /[/\\]private-assets[/\\].+\.webp$/.test(file) && !previewWordmarks.has(relative(directory, file).replaceAll('\\', '/')))) failures.push('El arte privado se copió a una carpeta pública.');
for (const name of ['SESSION_SECRET', 'ADMIN_PASSWORD', 'REDIS_URL', 'UPSTASH_REDIS_REST_TOKEN']) {
  const value = process.env[name];
  if (value && value.length >= 12 && source.includes(value)) failures.push('Un secreto del servidor llegó al cliente.');
}
if (failures.length) {
  for (const failure of new Set(failures)) console.error(failure);
  process.exitCode = 1;
} else console.log('Bundle público verificado: marcadores presentes, sin teléfonos privados ni secretos configurados.');
