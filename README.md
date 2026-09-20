# Text Editor

BlockNote notes editor for Portfolio, shipped as the `<text-editor>` custom
element (React inside, `shadowRoot` is null). Importing `dist/text-editor.js`
defines the tag; nothing is constructed from JS.

```
pnpm install
pnpm dev    # http://localhost:5173/  /dental.html  /host.html
pnpm build  # dist/text-editor.js + dist/text-editor.css
pnpm check  # tsc
pnpm test   # Playwright against the Vite demo (Chromium)
```

## Host contract

```html
<text-editor update-url="/notes/7" gallery-url="/cases/42/images">
  <textarea name="notes">[{"type":"paragraph"}]</textarea>
</text-editor>

<text-editor readonly>
  <textarea name="notes">[{"type":"paragraph"}]</textarea>
</text-editor>
```

- **Inner content:** one `textarea[name]` (or `input[name]`). Its value is the
  initial document and is rewritten with the BlockNote JSON string on every
  change, so a normal form submit always carries the latest notes. Invalid
  JSON or no child mounts a single empty paragraph.
- **Attributes**
  - `readonly` — not editable, no side menu, no `save`. Reacts when added or
    removed at runtime.
  - `gallery-url` — JSON endpoint (`{ visits: [{ title, images: [{ id, url,
    thumbnail }] }] }`) for the image panel's gallery tab.
  - `data-room-id`, `data-user-id` — optional y-webrtc collaboration (demo
    only; same-browser tabs sync over BroadcastChannel).
  - `update-url` — ignored by the widget; the host reads it to know where to
    POST.
- **Events:** `save` — bubbling `CustomEvent`, `detail` is the notes JSON
  string, dispatched 1500 ms after the last edit. Not emitted while `readonly`
  and **not emitted on disconnect**: the textarea is the flush, and a
  disconnect flush would double-submit next to a form POST.
- **Methods:** `.document`, `undo()`, `redo()`, `canUndo()`, `canRedo()`.
- **Network:** none. The widget never POSTs notes; `gallery-url` is the only
  fetch, and only when the gallery tab is opened.
- **Teardown:** removing the element unmounts React, cancels a pending save,
  and leaves the textarea in place. Re-inserting remounts from it.

Theme follows `html[data-bs-theme]` (`dark` / anything else).

## Blocks

Default BlockNote blocks minus audio / video / file, one heading level, plus
`toothChart`:

```json
{ "type": "toothChart", "props": { "teeth": "00200000000000000000000000000300" } }
```

`teeth` is 32 characters in FDI order `18…11 21…28 48…41 31…38`, one digit
per tooth: `0` default, `1` missing, `2` warning, `3` danger. Clicking a tooth
cycles through those in order; unknown characters read as `0`.

## Tests

| File | Covers |
|------|--------|
| `tests/contract.spec.ts` | Tag defined, no shadow root, textarea mount, invalid / empty child, readonly (static and runtime), no widget writes |
| `tests/save.spec.ts` | Immediate textarea sync, 1500 ms debounce, one save per burst, event shape |
| `tests/teardown.spec.ts` | No save on disconnect, textarea kept, re-append, wrapping form submits the latest notes |
| `tests/dental.spec.ts` | ODTP template, tooth cycle and storage, readonly chart |
| `tests/collab.spec.ts` | Room connect, two-tab sync |
| `tests/host.spec.ts` | Demo smoke: slash menu, gallery tab, heading size |

`host.html` is the plain-HTML fixture used by the contract / save / teardown
specs; it mirrors how Django renders the tag.
