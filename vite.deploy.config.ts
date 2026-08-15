import { cloudflare } from '@cloudflare/vite-plugin';
import { sites } from '@openai/sites-vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    sites(),
    cloudflare({
      viteEnvironment: { name: 'server' },
      config: {
        main: './worker/index.ts',
        compatibility_date: '2026-08-15',
        compatibility_flags: ['nodejs_compat'],
        d1_databases: [
          {
            binding: 'DB',
            database_name: 'site-creator-d1',
            database_id: '00000000-0000-4000-8000-000000000000',
          },
        ],
        assets: {
          not_found_handling: 'single-page-application',
          run_worker_first: ['/api/*'],
        },
      },
    }),
  ],
});
