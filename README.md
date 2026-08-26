# Invitación privada

Sitio en español con acceso personal, RSVP y panel privado de coordinación. Los detalles del evento y la lista de invitados permanecen en variables del servidor y no forman parte del JavaScript público.

## Desarrollo

```bash
npm install
npm run dev
```

- Invitación ficticia local: `INVITACION-DEMO`
- Panel ficticio local: `?coordinacion=demo`
- Fases locales: `?fase=before`, `?fase=during` y `?fase=after`

## Acceso de invitados

Cada invitación puede abrirse de dos maneras:

1. Enlace personal con token opaco: `?invite=TOKEN`
2. Código escrito manualmente como respaldo

Genera el registro completo de un invitado — código legible, hash y, si lo pides, enlace personal:

```bash
node scripts/generate-guest.mjs "María Rodríguez" 2
node scripts/generate-guest.mjs "María Rodríguez" 2 --link https://tu-dominio.com/
```

Imprime el código para el invitado y el objeto para `GUESTS_JSON`. El sitio nunca guarda el código, solo su SHA-256; el código en claro se comparte únicamente con el invitado y no se guarda en el repositorio.

El código no distingue mayúsculas ni espacios sobrantes: el servidor recorta y pasa a mayúsculas antes de comparar.

### Probar el worker en local

```bash
npm run build
cp .dev.vars dist/server/.dev.vars
npx wrangler dev --config dist/server/wrangler.json --local
```

`.dev.vars` va con **comillas simples**; entre comillas dobles los `\"` del JSON llegan escapados al worker, `JSON.parse` falla en silencio y toda autenticación devuelve 401 sin decir por qué.

## Panel de coordinación

La URL `?coordinacion=1` solicita la contraseña configurada en `ADMIN_PASSWORD`. El panel muestra asistentes totales, invitaciones declinadas, pendientes, acompañantes y canciones. Los datos se leen desde el mismo registro autoritativo del RSVP.

## Despliegue

Dos destinos, desde `main`:

| Destino | Qué es | Cómo despliega |
| --- | --- | --- |
| **Vercel** — [bianca-miguel-invitacion.vercel.app](https://bianca-miguel-invitacion.vercel.app) | La invitación real. Ejecuta `api/*.ts`, así que la puerta autentica y el RSVP se guarda en Redis. | Integración de Git de Vercel, en cada push a `main`. Sin workflow ni token. |
| **GitHub Pages** | Vista previa de diseño en `https://lologaby.github.io/bianca-miguel-invitacion/`. Estático: sin API, nadie entra con código y no se guarda nada. Se compila con `VITE_DEMO_PREVIEW=1`, que abre directamente la invitación de demostración. | `.github/workflows/pages.yml` |

La vista previa lleva datos de marcador a propósito. El evento real —lugares, fecha y número de ATH Móvil— nunca forma parte de ningún bundle: vive en `PRIVATE_EVENT_JSON` en el hosting, tanto para el worker como para las funciones de Vercel. Ambos workflows fallan si detectan esos datos en el repositorio.

Compilar la vista previa en local:

```bash
npm run build:pages
npx vite preview --config vite.preview.pages.config.ts
```

## Configuración de producción

Configura en el proveedor de hosting las variables descritas en `.env.example`:

- `SESSION_SECRET`
- `ADMIN_PASSWORD`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `GUESTS_JSON`
- `PRIVATE_EVENT_JSON`

No uses prefijos públicos como `VITE_` para ninguno de estos valores.

## Verificación

```bash
npm run check
python "C:\Users\agbm9\.codex\skills\build-immersive-wedding-sites\scripts\audit_wedding_site.py" .
```
