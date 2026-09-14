# Text Editor

BlockNote text editor used by Portfolio (and other front-end projects).
Build output is a pair of JS+CSS files, same pattern as `image-editor`.

The editor includes a custom tooth-chart block and optional Yjs collaboration
(same-browser tabs via y-webrtc when `roomId` / `data-room-id` is set).

## Building

```
pnpm install
pnpm build
```

This writes `dist/text-editor.js` and `dist/text-editor.css`.

## Demo

```
pnpm dev
```

Serves a sandbox at http://localhost:3000 (Editor) and
http://localhost:3000/dental.html (ODTP template). Open the same room in
another tab to collaborate locally.
