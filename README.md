# Text Editor

BlockNote text editor used by Portfolio (and other front-end projects).
Build output is a pair of JS+CSS files, same pattern as `image-editor`.

## Building

```
pnpm install
pnpm build
```

This writes `dist/text-editor.js` and `dist/text-editor.css`. When a sibling
`portfolio/` checkout is present, those files are also copied to:

```
../portfolio/cases/static/js/text_editor/
```

Watch mode:

```
pnpm dev
```
