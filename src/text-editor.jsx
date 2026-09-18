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
]);

function getEditorSlashMenuItems(editor) {
  const defaults = getDefaultReactSlashMenuItems(editor)
    .filter((item) => !HIDDEN_SLASH_KEYS.has(item.key))
    .map((item) =>
      item.key === 'heading' ? { ...item, title: 'Heading' } : item,
    );
  return [...defaults, insertToothChartItem(editor)];
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

const STATUS_CLASSES = {
  default: '',
  stale: 'border-warning',
  error: 'border-danger',
  saved: 'border-success',
};

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

export default class TextEditor {
  constructor({ target, props = {} }) {
    this.target = target;
    this.props = props;
    this.editorRef = { current: null };
    this.root = null;
    this.host = null;
    this.themeObserver = null;
    this.theme = props.theme || currentTheme();
    this.saveTimeout = undefined;
    this.saveGeneration = 0;
    this.status = 'default';
    this.ignoreSave = false;
    this.handleReady = () => {
      this.props.onReady?.(this);
    };
    this.handleChange = (blocks) => {
      const notes = JSON.stringify(blocks);
      const input = this.inputElement;
      if (input) input.value = notes;
      this.target.dataset.initialBlocks = notes;
      this.props.onChange?.(blocks);
      if (this.ignoreSave) {
        this.ignoreSave = false;
        return;
      }
      if (this.saveUrl && this.editable) this.scheduleSave();
    };
    this.mount();
    this.watchTheme();
  }

  get saveUrl() {
    return this.props.saveUrl || this.target.dataset.updateUrl || '';
  }

  get galleryUrl() {
    return this.props.galleryUrl || this.target.dataset.gallery || '';
  }

  get inputElement() {
    return (
      this.props.input ||
      this.target.querySelector('input[name], textarea[name]')
    );
  }

  get editable() {
    if (this.props.editable !== undefined) return Boolean(this.props.editable);
    return !this.target.hasAttribute('data-blocknote-readonly');
  }

  get roomId() {
    return this.props.roomId || this.target.dataset.roomId || '';
  }

  get user() {
    if (this.props.user) return this.props.user;
    return resolveUser(this.target.dataset.userId);
  }

  parseInitialBlocks() {
    if (isBlocknoteDocument(this.props.initialBlocks)) {
      return this.props.initialBlocks;
    }
    const fromDataset = parseBlocks(this.target.dataset.initialBlocks || '');
    if (fromDataset !== EMPTY_DOCUMENT || this.target.dataset.initialBlocks) {
      return fromDataset;
    }
    return parseBlocks(this.inputElement?.value || '');
  }

  ensureHost() {
    let host = this.target.querySelector(':scope > [data-text-editor-root]');
    if (!host) {
      host = document.createElement('div');
      host.setAttribute('data-text-editor-root', '');
      this.target.appendChild(host);
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
        onReady={this.handleReady}
        roomId={this.roomId}
        user={this.user || DEFAULT_USER}
        galleryUrl={this.galleryUrl}
      />,
    );
  }

  remount() {
    this.ignoreSave = true;
    const blocks = this.editorRef.current?.document;
    if (blocks) {
      this.target.dataset.initialBlocks = JSON.stringify(blocks);
      const input = this.inputElement;
      if (input) input.value = JSON.stringify(blocks);
    }
    this.root?.unmount();
    this.root = null;
    this.mount();
  }

  watchTheme() {
    if (this.props.theme) return;
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

  setStatus(status) {
    this.status = status;
    this.target.classList.remove(
      'border-warning',
      'border-danger',
      'border-success',
    );
    const nextClass = STATUS_CLASSES[status];
    if (nextClass) this.target.classList.add(nextClass);
  }

  scheduleSave() {
    this.setStatus('stale');
    clearTimeout(this.saveTimeout);
    const generation = ++this.saveGeneration;
    this.saveTimeout = setTimeout(
      () => this.save(generation),
      SAVE_DEBOUNCE_MS,
    );
  }

  save(generation) {
    const notes =
      this.inputElement?.value || JSON.stringify(this.document ?? EMPTY_DOCUMENT);
    if (typeof globalThis.up?.request !== 'function') {
      this.setStatus('error');
      return;
    }
    globalThis.up.request(this.saveUrl, {
      method: 'POST',
      params: { notes },
    })
      .then(() => {
        if (generation === this.saveGeneration) this.setStatus('saved');
      })
      .catch((error) => {
        if (error instanceof globalThis.up?.Response) {
          console.log(
            'Server responded with HTTP status %s and text %s',
            error.status,
            error.text,
          );
        } else {
          console.log('Fatal error during request:', error?.message);
        }
        if (generation === this.saveGeneration) this.setStatus('error');
      });
  }

  $destroy() {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = undefined;
    if (this.status === 'stale' && this.saveUrl && this.editable) {
      this.save(++this.saveGeneration);
    }
    this.themeObserver?.disconnect();
    this.themeObserver = null;
    this.root?.unmount();
    this.root = null;
    this.editorRef.current = null;
    this.host?.remove();
    this.host = null;
  }
}
