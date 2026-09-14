import { build, context } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const watch = process.argv.includes('--watch');
const root = dirname(fileURLToPath(import.meta.url));
const outfile = resolve(root, 'dist/text-editor.js');

const options = {
  entryPoints: [resolve(root, 'src/text-editor.jsx')],
  bundle: true,
  minify: !watch,
  sourcemap: false,
  format: 'esm',
  target: 'es2022',
  outfile,
  jsx: 'automatic',
  conditions: ['style'],
  loader: {
    '.woff': 'dataurl',
    '.woff2': 'dataurl',
  },
  logLevel: 'info',
};

mkdirSync(dirname(outfile), { recursive: true });

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
