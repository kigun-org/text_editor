import { build, context } from 'esbuild';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const watch = process.argv.includes('--watch');
const root = dirname(fileURLToPath(import.meta.url));
const outfile = resolve(root, 'dist/text-editor.js');
const portfolioDest = resolve(
  root,
  '../portfolio/cases/static/js/text_editor',
);

function copyToPortfolio() {
  if (!existsSync(resolve(root, '../portfolio'))) {
    console.warn('Sibling portfolio/ not found; skipping copy.');
    return;
  }
  mkdirSync(portfolioDest, { recursive: true });
  for (const name of ['text-editor.js', 'text-editor.css']) {
    cpSync(resolve(root, 'dist', name), resolve(portfolioDest, name));
  }
  console.info(`copied dist/text-editor.{js,css} → ${portfolioDest}`);
}

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
  plugins: [
    {
      name: 'copy-to-portfolio',
      setup(buildApi) {
        buildApi.onEnd((result) => {
          if (result.errors.length) return;
          copyToPortfolio();
        });
      },
    },
  ],
};

mkdirSync(dirname(outfile), { recursive: true });

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
