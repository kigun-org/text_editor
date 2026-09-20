import { useMemo, useEffect } from 'react';
import { filterSuggestionItems } from '@blocknote/core';
import { withCollaboration } from '@blocknote/core/yjs';
import {
  FormattingToolbar,
  FormattingToolbarController,
  SuggestionMenuController,
  blockTypeSelectItems,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  useBlockNoteEditor,
  useCreateBlockNote,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { createRoot } from 'react-dom/client';
import {
  EditorFilePanelController,
  EditorFileReplaceButton,
} from './blocks/EditorFilePanel';
import { GalleryUrlContext } from './blocks/GalleryTab';
import { insertToothChartItem, schema } from './blocks/schema';
import { DEFAULT_USER, resolveUser } from './collab/users';
import { useCollabSession } from './collab/useCollabSession';
import {
  canYRedo,
  canYUndo,
  clearYUndoStack,
  ensureYUndoListening,
  yRedo,
  yUndo,
} from './collab/yUndo';
import '@blocknote/mantine/style.css';
import './overrides.css';

const EMPTY_DOCUMENT = [{ type: 'paragraph' }];
const SAVE_DEBOUNCE_MS = 1500;
const HIDDEN_SLASH_KEYS = new Set([
  'heading_2',
  'heading_3',
  'heading_4',
  'heading_5',
  'heading_6',
  'toggle_heading',
  'toggle_heading_2',
  'toggle_heading_3',
  'toggle_list',
  'emoji',
  'video',
  'audio',
  'file',
  'code_block',
]);

const FIRST_SLASH_GROUP = [
  'heading',
  'paragraph',
  'numbered_list',
  'bullet_list',
  'check_list',
  'table',
  'quote',
  'divider',
];

function compactSlashItem(item, extra = {}) {
  return {
    ...item,
    ...extra,
    size: 'default',
    subtext: undefined,
  };
}

function getEditorSlashMenuItems(editor) {
  const byKey = new Map(
    getDefaultReactSlashMenuItems(editor)
      .filter((item) => !HIDDEN_SLASH_KEYS.has(item.key))
      .map((item) => [item.key, item]),
  );
  const used = new Set(FIRST_SLASH_GROUP);
  const firstGroup = FIRST_SLASH_GROUP.flatMap((key) => {
    const item = byKey.get(key);
    if (!item) return [];
    return [
      compactSlashItem(item, {
        group: undefined,
        title: key === 'heading' ? 'Heading' : item.title,
      }),
    ];
  });
  const image = byKey.get('image');
  if (image) used.add('image');
  const leftovers = [...byKey.values()]
    .filter((item) => !used.has(item.key))
    .map((item) => compactSlashItem(item, { group: undefined }));
  return [
    ...firstGroup,
    ...leftovers,
    ...(image
      ? [compactSlashItem(image, { group: 'Other' })]
      : []),
    compactSlashItem(insertToothChartItem(editor)),
  ];
}

function getEditorBlockTypeSelectItems(editor) {
  return blockTypeSelectItems(editor.dictionary)
    .filter((item) => {
      if (item.type === 'heading') {
        return item.props?.level === 1 && !item.props?.isToggleable;
      }
      return item.type !== 'toggleListItem';
    })
    .map((item) =>
      item.type === 'heading' ? { ...item, name: 'Heading' } : item,
    );
}

function EditorFormattingToolbar() {
  const editor = useBlockNoteEditor();
  const items = useMemo(
    () => getEditorBlockTypeSelectItems(editor),
    [editor],
  );
  const toolbarItems = useMemo(
    () =>
      getFormattingToolbarItems(items).map((item) =>
        item.key === 'replaceFileButton' ? (
          <EditorFileReplaceButton key="replaceFileButton" />
        ) : (
          item
        ),
      ),
    [items],
  );
  return <FormattingToolbar>{toolbarItems}</FormattingToolbar>;
}

function currentTheme() {
  return document.documentElement.getAttribute('data-bs-theme') === 'dark'
    ? 'dark'
    : 'light';
}

function isBlocknoteDocument(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((block) => block && typeof block.type === 'string')
  );
}

function parseBlocks(value) {
  if (isBlocknoteDocument(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return EMPTY_DOCUMENT;
  try {
    const parsed = JSON.parse(value);
    return isBlocknoteDocument(parsed) ? parsed : EMPTY_DOCUMENT;
  } catch {
    return EMPTY_DOCUMENT;
  }
}

function useEditorLifecycle(editor, editorRef, onChange, onReady) {
  useEffect(() => {
    editorRef.current = editor;
    onReady?.(editor);
    if (!onChange) {
      return () => {
        editorRef.current = null;
      };
    }
    const unsubscribe = editor.onChange(() => {
      onChange(editor.document);
    });
    return () => {
      unsubscribe();
      editorRef.current = null;
    };
  }, [editor, editorRef, onChange, onReady]);
}

function EditorView({ editor, theme, editable }) {
  const getSlashMenuItems = useMemo(
    () => async (query) =>
      filterSuggestionItems(getEditorSlashMenuItems(editor), query),
    [editor],
  );

  return (
    <BlockNoteView
      editor={editor}
      theme={theme}
      editable={editable}
      formattingToolbar={false}
      slashMenu={false}
      filePanel={false}
      emojiPicker={false}
      sideMenu={editable}
      portalElements={{ default: null }}
    >
      {editable ? (
        <>
          <FormattingToolbarController
            formattingToolbar={EditorFormattingToolbar}
          />
          <EditorFilePanelController />
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={getSlashMenuItems}
          />
        </>
      ) : null}
    </BlockNoteView>
  );
}

function LocalProseEditor({
  initialBlocks,
  theme,
  editable,
  editorRef,
  onChange,
  onReady,
}) {
  const editor = useCreateBlockNote({
    schema,
    initialContent: initialBlocks,
    trailingBlock: editable,
  });
  useEditorLifecycle(editor, editorRef, onChange, onReady);
  return <EditorView editor={editor} theme={theme} editable={editable} />;
}

function CollabEditorReady({
  doc,
  provider,
  user,
  initialBlocks,
  theme,
  editable,
  editorRef,
  onChange,
  onReady,
}) {
  const editor = useCreateBlockNote(
    withCollaboration({
      schema,
      trailingBlock: editable,
      collaboration: {
        provider,
        fragment: doc.getXmlFragment('document-store'),
        user: {
          name: user.username,
          color: user.color,
        },
        showCursorLabels: 'activity',
      },
    }),
    [provider, doc, user.color, user.username],
  );

  useEffect(() => {
    ensureYUndoListening(editor);
    const [first, ...rest] = editor.document;
    const isEmptyPlaceholder =
      rest.length === 0 &&
      first?.type === 'paragraph' &&
      first.id === 'initialBlockId';
    if (isEmptyPlaceholder) {
      editor.replaceBlocks(editor.document, initialBlocks);
      clearYUndoStack(editor);
    }
  }, [editor, initialBlocks]);

  useEditorLifecycle(editor, editorRef, onChange, onReady);
  return <EditorView editor={editor} theme={theme} editable={editable} />;
}

function CollabProseEditor({
  roomId,
  user,
  initialBlocks,
  theme,
  editable,
  editorRef,
  onChange,
  onReady,
}) {
  const session = useCollabSession(roomId);
  if (!session) {
    return <div className="editor-connecting">Connecting to room…</div>;
  }
  return (
    <CollabEditorReady
      doc={session.doc}
      provider={session.provider}
      user={user}
      initialBlocks={initialBlocks}
      theme={theme}
      editable={editable}
      editorRef={editorRef}
      onChange={onChange}
      onReady={onReady}
    />
  );
}

function ProseEditor({
  initialBlocks,
  theme,
  editable,
  editorRef,
  onChange,
  onReady,
  roomId,
  user,
  galleryUrl,
}) {
  const editor = roomId ? (
    <CollabProseEditor
      roomId={roomId}
      user={user}
      initialBlocks={initialBlocks}
      theme={theme}
      editable={editable}
      editorRef={editorRef}
      onChange={onChange}
      onReady={onReady}
    />
  ) : (
    <LocalProseEditor
      initialBlocks={initialBlocks}
      theme={theme}
      editable={editable}
      editorRef={editorRef}
      onChange={onChange}
      onReady={onReady}
    />
  );

  return (
    <GalleryUrlContext.Provider value={galleryUrl || undefined}>
      {editor}
    </GalleryUrlContext.Provider>
  );
}

export default class TextEditorElement extends HTMLElement {
  static observedAttributes = [
    'readonly',
    'gallery-url',
    'data-room-id',
    'data-user-id',
  ];

  constructor() {
    super();
    this.editorRef = { current: null };
    this.root = null;
    this.host = null;
    this.themeObserver = null;
    this.theme = currentTheme();
    this.saveTimeout = undefined;
    this.dirty = false;
    this.ignoreSave = false;
    this.handleChange = (blocks) => {
      const notes = JSON.stringify(blocks);
      const input = this.inputElement;
      if (input) input.value = notes;
      if (this.ignoreSave) {
        this.ignoreSave = false;
        return;
      }
      if (!this.editable) return;
      this.dirty = true;
      this.scheduleSave();
    };
  }

  connectedCallback() {
    this.mount();
    this.watchTheme();
  }

  disconnectedCallback() {
    // No `save` on disconnect. The child textarea always holds the latest
    // document, so the enclosing form (or the host) persists it; emitting here
    // would double-submit next to a form POST. Same rule as the HugeRTE host.
    this.teardown();
  }

  attributeChangedCallback(_name, oldValue, newValue) {
    // Before connect the root is null and mount() reads the attributes itself.
    if (!this.root || oldValue === newValue) return;
    this.remount();
  }

  get inputElement() {
    return this.querySelector(':scope > textarea, :scope > input');
  }

  get editable() {
    return !this.hasAttribute('readonly');
  }

  get galleryUrl() {
    return this.getAttribute('gallery-url') || '';
  }

  get roomId() {
    return this.getAttribute('data-room-id') || '';
  }

  get user() {
    return resolveUser(this.getAttribute('data-user-id') || undefined);
  }

  parseInitialBlocks() {
    return parseBlocks(this.inputElement?.value || '');
  }

  ensureHost() {
    let host = this.querySelector(':scope > [data-text-editor-root]');
    if (!host) {
      host = document.createElement('div');
      host.setAttribute('data-text-editor-root', '');
      this.appendChild(host);
    }
    this.host = host;
    return host;
  }

  mount() {
    this.root = createRoot(this.ensureHost());
    this.root.render(
      <ProseEditor
        initialBlocks={this.parseInitialBlocks()}
        theme={this.theme}
        editable={this.editable}
        editorRef={this.editorRef}
        onChange={this.handleChange}
        roomId={this.roomId}
        user={this.user || DEFAULT_USER}
        galleryUrl={this.galleryUrl}
      />,
    );
  }

  remount() {
    this.ignoreSave = true;
    const blocks = this.editorRef.current?.document;
    if (blocks && this.inputElement) {
      this.inputElement.value = JSON.stringify(blocks);
    }
    this.root?.unmount();
    this.root = null;
    this.mount();
  }

  watchTheme() {
    this.themeObserver?.disconnect();
    this.themeObserver = new MutationObserver(() => {
      const next = currentTheme();
      if (next === this.theme) return;
      this.theme = next;
      this.remount();
    });
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-bs-theme'],
    });
  }

  get document() {
    return this.editorRef.current?.document;
  }

  undo() {
    const editor = this.editorRef.current;
    if (!editor) return false;
    return this.roomId ? yUndo(editor) : editor.undo();
  }

  redo() {
    const editor = this.editorRef.current;
    if (!editor) return false;
    return this.roomId ? yRedo(editor) : editor.redo();
  }

  canUndo() {
    const editor = this.editorRef.current;
    if (!editor) return false;
    return this.roomId ? canYUndo(editor) : true;
  }

  canRedo() {
    const editor = this.editorRef.current;
    if (!editor) return false;
    return this.roomId ? canYRedo(editor) : true;
  }

  scheduleSave() {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = undefined;
      this.emitSave();
    }, SAVE_DEBOUNCE_MS);
  }

  emitSave() {
    if (!this.dirty || !this.editable) return;
    this.dirty = false;
    const notes =
      this.inputElement?.value ||
      JSON.stringify(this.document ?? EMPTY_DOCUMENT);
    this.dispatchEvent(new CustomEvent('save', { bubbles: true, detail: notes }));
  }

  teardown() {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = undefined;
    this.dirty = false;
    this.themeObserver?.disconnect();
    this.themeObserver = null;
    this.root?.unmount();
    this.root = null;
    this.editorRef.current = null;
    this.host?.remove();
    this.host = null;
  }
}

if (!customElements.get('text-editor')) {
  customElements.define('text-editor', TextEditorElement);
}
