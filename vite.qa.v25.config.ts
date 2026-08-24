import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { readFile } from 'node:fs/promises';

function privatePreviewAssets(): Plugin {
  const assets = new Map([
    ['/private-assets/wordmark.webp', fileURLToPath(new URL('./worker/private-assets/wordmark.webp', import.meta.url))],
    ['/private-assets/wordmark-450.webp', fileURLToPath(new URL('./worker/private-assets/wordmark-450.webp', import.meta.url))],
    ['/private-assets/cover-art.webp', fileURLToPath(new URL('./worker/private-assets/cover-art.webp', import.meta.url))],
    ['/private-assets/cover-art-470.webp', fileURLToPath(new URL('./worker/private-assets/cover-art-470.webp', import.meta.url))],
  ]);

  return {
    name: 'private-preview-assets',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = request.url ? new URL(request.url, 'http://localhost').pathname : '';
        const asset = assets.get(pathname);
        if (!asset) return next();
        response.statusCode = 200;
        response.setHeader('content-type', pathname.endsWith('.webp') ? 'image/webp' : 'image/png');
        response.setHeader('cache-control', 'no-store');
        response.end(await readFile(asset));
      });
    },
  };
}

export default defineConfig({
  base: './',
  resolve: {
    alias: [
      { find: /^\/src\/main\.tsx$/, replacement: fileURLToPath(new URL('./src/main-mobile-v22.tsx', import.meta.url)) },
      { find: './components/InvitationGate', replacement: fileURLToPath(new URL('./src/components/InvitationGateMobileV18.tsx', import.meta.url)) },
      { find: './components/VisualAssets', replacement: fileURLToPath(new URL('./src/components/VisualAssetsClientPreview.tsx', import.meta.url)) },
    ],
  },
  plugins: [
    react(),
    privatePreviewAssets(),
    {
      name: 'wedding-safe-viewport',
      transformIndexHtml(html) {
        return html.replace('width=device-width, initial-scale=1.0', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
      },
    },
  ],
});
