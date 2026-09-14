# Text Editor

BlockNote text editor used by Portfolio (and other front-end projects).
Build output is a pair of JS+CSS files, same pattern as `image-editor`.

The editor includes a custom tooth-chart block and optional Yjs collaboration
(same-browser tabs via y-webrtc when `roomId` / `data-room-id` is set).

```
pnpm install
pnpm dev    # http://localhost:5173/ and /dental.html
pnpm build  # dist/text-editor.js + dist/text-editor.css
pnpm test   # Playwright against the Vite demo
```

Open the same room in another tab to collaborate locally.
