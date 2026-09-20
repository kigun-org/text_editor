import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['yjs', 'y-webrtc', 'y-prosemirror'],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        dental: resolve(import.meta.dirname, 'dental.html'),
        host: resolve(import.meta.dirname, 'host.html'),
      },
    },
  },
});
