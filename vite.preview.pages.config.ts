import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { copyFile, mkdir } from 'node:fs/promises';

/**
 * The design-preview build, published to GitHub Pages.
 *
 * Pages is static hosting: there is no worker and no /api/*, so the invitation
 * cannot authenticate anyone and cannot record an RSVP. This build exists purely
 * so the design can be looked at and shared. VITE_DEMO_PREVIEW makes the gate
 * open onto the demo invitation, which carries placeholder venues, a placeholder
 * date and no real payment number — the real event lives only in the host's
 * PRIVATE_EVENT_JSON and is never part of any bundle.
 *
 * Reachable inside the preview:
 *   /                 the invitation
 *   /?vista=entrada   the access screen
 *   /?vista=sobre     the envelope opening
 */

/** The wordmark is normally served by the worker; a static build has to carry it. */
function bundleWordmark(): Plugin {
  return {
    name: 'preview-wordmark',
    async closeBundle() {
      const out = fileURLToPath(new URL('./dist-pages/private-assets/', import.meta.url));
      await mkdir(out, { recursive: true });
      for (const file of ['wordmark.webp', 'wordmark-450.webp']) {
        await copyFile(fileURLToPath(new URL(`./worker/private-assets/${file}`, import.meta.url)), out + file);
      }
    },
  };
}

export default defineConfig({
  // Pages serves this repository at /<repo>/, so every asset URL needs the prefix
  base: '/bianca-miguel-invitacion/',
  define: { 'import.meta.env.VITE_DEMO_PREVIEW': JSON.stringify('1') },
  resolve: {
    alias: [
      { find: /^\/src\/main\.tsx$/, replacement: fileURLToPath(new URL('./src/main-mobile-v22.tsx', import.meta.url)) },
      { find: './components/InvitationGate', replacement: fileURLToPath(new URL('./src/components/InvitationGateMobileV18.tsx', import.meta.url)) },
      { find: './components/VisualAssets', replacement: fileURLToPath(new URL('./src/components/VisualAssetsClientPreview.tsx', import.meta.url)) },
    ],
  },
  build: { outDir: 'dist-pages', emptyOutDir: true },
  plugins: [
    react(),
    bundleWordmark(),
    {
      name: 'wedding-safe-viewport',
      transformIndexHtml(html) {
        return html
          .replace('width=device-width, initial-scale=1.0', 'width=device-width, initial-scale=1.0, viewport-fit=cover')
          // a shared preview link must never be indexed
          .replace('</head>', '  <meta name="robots" content="noindex, nofollow, noarchive" />\n  </head>');
      },
    },
  ],
});
