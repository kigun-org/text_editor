import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  publicDir: false,
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(
      mode === 'production' || mode === 'portfolio' ? 'production' : 'development',
    ),
    global: 'globalThis',
  },
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 1024 * 1024,
    rolldownOptions: {
      external: mode === 'portfolio' ? ['yjs'] : [],
      output: {
        paths: { yjs: '../../shared/yjs.js' },
        codeSplitting: false,
      },
    },
    lib: {
      entry: resolve(import.meta.dirname, 'src/text-editor.jsx'),
      formats: ['es'],
      fileName: () => 'text-editor.js',
      cssFileName: 'text-editor',
    },
  },
}));
