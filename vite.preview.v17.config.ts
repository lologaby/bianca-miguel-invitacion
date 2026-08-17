import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      './components/InvitationGate': fileURLToPath(new URL('./src/components/InvitationGateEnvelope.tsx', import.meta.url)),
      './components/VisualAssets': fileURLToPath(new URL('./src/components/VisualAssetsClientPreview.tsx', import.meta.url)),
    },
  },
  plugins: [react()],
});
