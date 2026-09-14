import { useEffect, useRef, useState } from "react";
import type { PartialBlock } from "@blocknote/core";
import {
  COLLAB_USERS,
  type CollabUser,
} from "../collab/users";
import TextEditor from "../text-editor.jsx";

type AppProps = {
  page: "index" | "dental";
  defaultRoomId: string;
  initialContent: PartialBlock[];
  missingTeeth?: number[];
};

export function App({
  page,
  defaultRoomId,
  initialContent,
  missingTeeth,
}: AppProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<TextEditor | null>(null);
  const [roomId, setRoomId] = useState(defaultRoomId);
  const [roomDraft, setRoomDraft] = useState(defaultRoomId);
  const [user, setUser] = useState<CollabUser>(COLLAB_USERS[0]);
  const [document, setDocument] = useState<unknown[] | null>(null);
  const [historyTick, setHistoryTick] = useState(0);

  useEffect(() => {
    setRoomDraft(roomId);
  }, [roomId]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const editor = new TextEditor({
      target: host,
      props: {
        initialBlocks: initialContent,
        roomId,
        user,
        missingTeeth,
        saveUrl: "/demo-save",
        onChange: (blocks: unknown[]) => {
          setDocument(blocks);
          setHistoryTick((tick) => tick + 1);
        },
        onReady: (instance: TextEditor) => {
          editorRef.current = instance;
          setDocument(instance.document ?? null);
          setHistoryTick((tick) => tick + 1);
        },
      },
    });
    editorRef.current = editor;

    return () => {
      editor.$destroy();
      editorRef.current = null;
    };
  }, [roomId, user, initialContent, missingTeeth]);

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

      <div
        ref={hostRef}
        className="editor-shell text-editor"
        data-blocknote
      >
        <textarea name="notes" defaultValue="" readOnly />
      </div>

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
