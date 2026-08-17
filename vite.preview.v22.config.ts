import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

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
    {
      name: 'wedding-safe-viewport',
      transformIndexHtml(html) {
        return html.replace('width=device-width, initial-scale=1.0', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
      },
    },
  ],
});
