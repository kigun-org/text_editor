import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import type { PartialBlock } from "@blocknote/core";
import {
  COLLAB_USERS,
  type CollabUser,
} from "../collab/users";
import type TextEditorElement from "../text-editor.jsx";

type AppProps = {
  page: "index" | "dental";
  defaultRoomId: string;
  initialContent: PartialBlock[];
};

const EditorHost = memo(function EditorHost({
  notes,
  roomId,
  userId,
  galleryUrl,
  editorRef,
}: {
  notes: string;
  roomId: string;
  userId: string;
  galleryUrl?: string;
  editorRef: Ref<TextEditorElement>;
}) {
  return (
    <text-editor
      ref={editorRef}
      className="editor-shell"
      update-url="/demo-save"
      gallery-url={galleryUrl}
      data-room-id={roomId}
      data-user-id={userId}
    >
      <textarea name="notes" defaultValue={notes} readOnly />
    </text-editor>
  );
});

export function App({
  page,
  defaultRoomId,
  initialContent,
}: AppProps) {
  const editorRef = useRef<TextEditorElement | null>(null);
  const search = new URLSearchParams(window.location.search);
  const [roomId, setRoomId] = useState(
    () => search.get("room") || defaultRoomId,
  );
  const [roomDraft, setRoomDraft] = useState(roomId);
  const [user, setUser] = useState<CollabUser>(COLLAB_USERS[0]);
  const [document, setDocument] = useState<unknown[] | null>(null);
  const [historyTick, setHistoryTick] = useState(0);
  const galleryUrl = search.get("gallery") || undefined;
  const notes = useMemo(
    () => JSON.stringify(initialContent),
    [initialContent],
  );

  useEffect(() => {
    setRoomDraft(roomId);
  }, [roomId]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const sync = () => {
      setDocument(editor.document ?? null);
      setHistoryTick((tick) => tick + 1);
    };
    editor.addEventListener("save", sync);
    const ready = window.setTimeout(sync, 100);
    return () => {
      editor.removeEventListener("save", sync);
      window.clearTimeout(ready);
    };
  }, [roomId, user]);

  void historyTick;
  const canUndo = editorRef.current?.canUndo() ?? false;
  const canRedo = editorRef.current?.canRedo() ?? false;
  const documentJson = document ? JSON.stringify(document, null, 2) : "[]";

  return (
    <main className={page === "dental" ? "app app--wide" : "app"}>
      <nav className="nav" aria-label="Pages">
        <a
          className={page === "index" ? "nav__link nav__link--active" : "nav__link"}
          href="/"
        >
          Editor
        </a>
        <a
          className={
            page === "dental" ? "nav__link nav__link--active" : "nav__link"
          }
          href="/dental.html"
        >
          Dental
        </a>
      </nav>

      <header className="toolbar">
        <label className="toolbar__field">
          <span>History</span>
          <button
            type="button"
            disabled={!canUndo}
            onClick={() => {
              editorRef.current?.undo();
              setHistoryTick((tick) => tick + 1);
            }}
          >
            Undo
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={() => {
              editorRef.current?.redo();
              setHistoryTick((tick) => tick + 1);
            }}
          >
            Redo
          </button>
        </label>

        <label className="toolbar__field">
          <span>Room</span>
          <input
            value={roomDraft}
            onChange={(event) => setRoomDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && roomDraft.trim()) {
                setRoomId(roomDraft.trim());
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (roomDraft.trim()) {
                setRoomId(roomDraft.trim());
              }
            }}
          >
            Join
          </button>
        </label>

        <label className="toolbar__field">
          <span>User</span>
          <select
            value={user.id}
            onChange={(event) => {
              const next = COLLAB_USERS.find(
                (candidate) => candidate.id === event.target.value,
              );
              if (next) {
                setUser(next);
              }
            }}
          >
            {COLLAB_USERS.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.username}
              </option>
            ))}
          </select>
        </label>

        <p className="toolbar__hint">
          Open another tab on room <code>{roomId}</code> to collaborate locally
          (same browser). Undo: ⌘/Ctrl+Z · Redo: ⌘/Ctrl+Shift+Z
        </p>
      </header>

      <EditorHost
        notes={notes}
        roomId={roomId}
        userId={user.id}
        galleryUrl={galleryUrl}
        editorRef={editorRef}
      />

      <section className="code-panel" aria-label="Editor document JSON">
        <header className="code-panel__header">
          <span>JSON</span>
          <span className="code-panel__hint">
            editor.document · room: {roomId}
          </span>
        </header>
        <pre className="code-panel__body">
          <code>{documentJson}</code>
        </pre>
      </section>
    </main>
  );
}
