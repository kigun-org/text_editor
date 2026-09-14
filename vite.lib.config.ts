import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  publicDir: false,
  plugins: [react()],
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 1024 * 1024,
    rolldownOptions: {
      output: {
        codeSplitting: false,
      },
    },
    lib: {
      entry: resolve(__dirname, 'src/text-editor.jsx'),
      formats: ['es'],
      fileName: () => 'text-editor.js',
      cssFileName: 'text-editor',
    },
  },
});
