import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

/**
 * The build Vercel serves.
 *
 * The Cloudflare build (vite.deploy.v23.config.ts) bundles a worker and writes
 * to dist/client + dist/server. On Vercel the server side is api/*.ts instead,
 * so this emits a plain static client to dist/ — which is where Vercel looks by
 * default for a Vite project, and why the first deploy returned 404 for every
 * page.
 *
 * The wordmark is served by the worker on Cloudflare; here it has to ship as a
 * static asset, so it is copied into public/private-assets by the build command.
 */
export default defineConfig({
  base: '/',
  resolve: {
    alias: [
      { find: /^\/src\/main\.tsx$/, replacement: fileURLToPath(new URL('./src/main-mobile-v22.tsx', import.meta.url)) },
      { find: './components/InvitationGate', replacement: fileURLToPath(new URL('./src/components/InvitationGateMobileV18.tsx', import.meta.url)) },
      { find: './components/VisualAssets', replacement: fileURLToPath(new URL('./src/components/VisualAssetsClientPreview.tsx', import.meta.url)) },
    ],
  },
  build: { outDir: 'dist', emptyOutDir: true },
  plugins: [
    react(),
    {
      name: 'wedding-safe-viewport',
      transformIndexHtml(html) {
        return html.replace('width=device-width, initial-scale=1.0', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
      },
    },
  ],
});
