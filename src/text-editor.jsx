import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { createRoot } from 'react-dom/client';
import { useEffect } from 'react';
import '@blocknote/mantine/style.css';
import './overrides.css';

const EMPTY_DOCUMENT = [{ type: 'paragraph' }];
const SAVE_DEBOUNCE_MS = 1500;
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

function ProseEditor({ initialBlocks, theme, editable, editorRef, onChange }) {
  const editor = useCreateBlockNote({
    initialContent: initialBlocks,
    trailingBlock: editable,
  });

  useEffect(() => {
    editorRef.current = editor;
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
  }, [editor, editorRef, onChange]);

  return (
    <BlockNoteView
      editor={editor}
      theme={theme}
      editable={editable}
      formattingToolbar={editable}
      slashMenu={editable}
      sideMenu={editable}
    />
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
