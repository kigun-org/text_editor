import { build, context } from 'esbuild';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const watch = process.argv.includes('--watch');
const root = dirname(fileURLToPath(import.meta.url));
const dist = resolve(root, 'dist');

function copyPublic() {
  const publicDir = resolve(root, 'public');
  if (!existsSync(publicDir)) return;
  mkdirSync(dist, { recursive: true });
  cpSync(publicDir, dist, { recursive: true });
}

const shared = {
  bundle: true,
  minify: !watch,
  sourcemap: watch,
  format: 'esm',
  target: 'es2022',
  jsx: 'automatic',
  conditions: ['style'],
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': watch ? '"development"' : '"production"',
  },
};

const widgetOptions = {
  ...shared,
  entryPoints: [resolve(root, 'src/text-editor.jsx')],
  outfile: resolve(dist, 'text-editor.js'),
  loader: {
    '.woff': 'dataurl',
    '.woff2': 'dataurl',
  },
};

const demoOptions = {
  ...shared,
  entryPoints: [
    resolve(root, 'src/demo/main.tsx'),
    resolve(root, 'src/demo/dental.tsx'),
  ],
  outdir: dist,
  loader: {
    '.woff': 'file',
    '.woff2': 'file',
  },
  plugins: [
    {
      name: 'copy-public',
      setup(buildApi) {
        buildApi.onEnd((result) => {
          if (result.errors.length) return;
          copyPublic();
        });
      },
    },
  ],
};

mkdirSync(dist, { recursive: true });
copyPublic();

if (watch) {
  const widgetCtx = await context(widgetOptions);
  const demoCtx = await context(demoOptions);
  await Promise.all([widgetCtx.watch(), demoCtx.watch()]);
  const { hosts, port } = await demoCtx.serve({
    servedir: dist,
    port: 3000,
  });
  for (const host of hosts) {
    console.log(`Dev server at http://${host}:${port}`);
  }
  console.log(`Dev server at http://localhost:${port}`);
  console.log(`Dental demo → http://localhost:${port}/dental.html`);
} else {
  await build(widgetOptions);
  await build(demoOptions);
}
