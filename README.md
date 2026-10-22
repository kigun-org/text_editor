# Text Editor

BlockNote notes editor for Portfolio, shipped as the `<text-editor>` custom
element (React inside, `shadowRoot` is null). Importing `dist/text-editor.js`
defines the tag; nothing is constructed from JS. The widget edits and reports;
the host persists.

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
  - `readonly` — not editable, no side menu, and no edit events. Reacts
    when added or removed at runtime. With Hocuspocus room attributes, a
    read-only host connects and receives live updates. Otherwise it shows
    the stored textarea document.
  - `gallery-url` — JSON endpoint (`{ visits: [{ title, images: [{ id, url,
    thumbnail }] }] }`) for the image panel's gallery tab.
  - `data-room-id`, `realtime-url`, `token-url` — optional Hocuspocus live
    notes for writable and read-only hosts. A server read-only grant also
    disables editing. Without `realtime-url`/`token-url`, `data-room-id`
    uses y-webrtc for editable hosts (demo only).
  - `data-user-id`, `data-user-name`, `data-user-color` — cursor label in a
    live room (host usually copies these from `<meta name="realtime">`).
  - `update-url` — ignored by the widget; the host reads it to know where to
    POST.
- **Event:** `input` — bubbling plain `Event`, no payload, dispatched on the
  `<text-editor>` after every edit, once the textarea has been rewritten. Not
  fired while `readonly`. The widget has **no** `save` event and no timer: the
  host owns autosave (Portfolio's compiler goes `border-warning` on `input`,
  debounces 1500 ms, POSTs the textarea, then `border-success` /
  `border-danger`, exactly like the HugeRTE compiler).

  Native `input` events from the contenteditable bubble through the tag as
  well, before BlockNote has processed them. Filter on
  `event.target === element` to get only the widget's own event, which
  guarantees the textarea is current.
- **Methods:** `.document`, `undo()`, `redo()`, `canUndo()`, `canRedo()`.
- **Network:** none. The widget never POSTs notes; `gallery-url` is the only
  fetch, and only when the gallery tab is opened.
- **Teardown:** removing the element unmounts React and leaves the textarea in
  place. Nothing is flushed (a form submit already carries the textarea).
  Re-inserting remounts from it.

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
| `tests/contract.spec.ts` | Tag defined, no shadow root, textarea mount, invalid / empty child, readonly (static and runtime) |
| `tests/input.spec.ts` | Immediate textarea sync, `input` per edit with the textarea already current, target filtering, no widget writes, readonly silence, `.document` |
| `tests/teardown.spec.ts` | Nothing emitted on disconnect, textarea kept, re-append, wrapping form submits the latest notes |
| `tests/dental.spec.ts` | ODTP template, tooth cycle and storage, readonly chart |
| `tests/collab.spec.ts` | Room connect, two-tab sync |
| `tests/host.spec.ts` | Demo smoke: slash menu, gallery tab, heading size |

`host.html` is the plain-HTML fixture used by the contract / input / teardown
specs; it mirrors how Django renders the tag. The 1500 ms debounce and the
POST live in Portfolio's `compilers.js` and are covered by its e2e test
`test_text_editor_autosaves_after_input_debounce`.

## License

Licensed under AGPL-3.0-only. See [LICENSE](LICENSE).

## Word limits

Set `word-limit="200"` to show a word counter and an over-limit warning.
Omitted, invalid, or non-positive values hide the counter. Changes to this
attribute update the counter without resetting the editor. Read-only editors
also show the count. The limit never blocks edits or saves.

The counter uses whitespace-separated tokens containing a Unicode letter or
number. It includes template text, headings, lists, nested blocks, table cells,
link labels, and image captions. Formatting does not split words. URLs,
metadata, and tooth-chart values do not count. Hyphenated words and contractions
count as one word; punctuation alone does not count.
