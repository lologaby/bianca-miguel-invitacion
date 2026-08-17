import { cloudflare } from '@cloudflare/vite-plugin';
import { sites } from '@openai/sites-vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: './',
  resolve: {
    alias: [
      { find: /^\/src\/main\.tsx$/, replacement: fileURLToPath(new URL('./src/main-mobile-v21.tsx', import.meta.url)) },
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
    sites(),
    cloudflare({
      viteEnvironment: { name: 'server' },
      config: {
        main: './worker/index-miguel.ts', compatibility_date: '2026-08-15', compatibility_flags: ['nodejs_compat'],
        d1_databases: [{ binding: 'DB', database_name: 'site-creator-d1', database_id: '00000000-0000-4000-8000-000000000000' }],
        assets: { not_found_handling: 'single-page-application', run_worker_first: ['/api/*'] },
      },
    }),
  ],
});
