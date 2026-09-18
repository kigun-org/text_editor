# Text Editor

BlockNote text editor used by Portfolio (and other front-end projects).
Build output is a pair of JS+CSS files, same pattern as `image-editor`.

Importing the bundle defines `<text-editor>` (`shadowRoot` is null). The
document lives in a child `textarea`. Editable hosts listen for a bubbling
`save` event (`detail` is the notes JSON string) and persist themselves.

```html
<text-editor update-url="/notes" gallery-url="/42/images">
  <textarea name="notes">[{"type":"paragraph"}]</textarea>
</text-editor>
```

`readonly` disables editing and save. Optional `data-room-id` / `data-user-id`
enable same-browser y-webrtc collaboration.

```
pnpm install
pnpm dev    # http://localhost:5173/ and /dental.html
pnpm build  # dist/text-editor.js + dist/text-editor.css
pnpm test   # Playwright against the Vite demo
```

Open the same room in another tab to collaborate locally.
