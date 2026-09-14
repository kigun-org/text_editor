import { useEffect, useState } from "react";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";

export type CollabSession = {
  doc: Y.Doc;
  provider: WebrtcProvider;
};

type Entry = CollabSession & {
  refs: number;
  disposeTimer?: ReturnType<typeof setTimeout>;
};

/**
 * y-webrtc allows only one provider per room name per JS realm, and
 * `provider.destroy()` removes the room asynchronously. Creating providers in
 * render/useMemo (or immediately recreating after destroy) races under React
 * StrictMode. Refcount + deferred dispose lets StrictMode remounts reuse the
 * same session safely.
 */
const entries = new Map<string, Entry>();
const roomFree = new Map<string, Promise<void>>();

async function waitForRoomFree(roomId: string) {
  const pending = roomFree.get(roomId);
  if (pending) {
    await pending;
  }
}

async function acquire(roomId: string): Promise<CollabSession> {
  await waitForRoomFree(roomId);

  let entry = entries.get(roomId);

  if (entry?.disposeTimer !== undefined) {
    clearTimeout(entry.disposeTimer);
    entry.disposeTimer = undefined;
  }

  if (!entry) {
    const doc = new Y.Doc();
    // Empty signaling = no remote servers; same-origin tabs sync via BroadcastChannel.
    const provider = new WebrtcProvider(roomId, doc, { signaling: [] });
    entry = { doc, provider, refs: 0 };
    entries.set(roomId, entry);
  }

  entry.refs += 1;
  return { doc: entry.doc, provider: entry.provider };
}

function release(roomId: string) {
  const entry = entries.get(roomId);
  if (!entry) {
    return;
  }

  entry.refs -= 1;
  if (entry.refs > 0) {
    return;
  }

  entry.disposeTimer = setTimeout(() => {
    if (entry.refs > 0) {
      return;
    }

    entries.delete(roomId);

    const free = (async () => {
      entry.provider.destroy();
      // destroy() deletes the room in a microtask after `key` resolves.
      await entry.provider.key.catch(() => undefined);
      await Promise.resolve();
      entry.doc.destroy();
    })();

    roomFree.set(roomId, free);
    void free.finally(() => {
      if (roomFree.get(roomId) === free) {
        roomFree.delete(roomId);
      }
    });
  }, 0);
}

export function useCollabSession(roomId: string): CollabSession | null {
  const [session, setSession] = useState<CollabSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    let shouldReleaseOnCleanup = false;

    void acquire(roomId).then((next) => {
      if (cancelled) {
        release(roomId);
        return;
      }
      shouldReleaseOnCleanup = true;
      setSession(next);
    });

    return () => {
      cancelled = true;
      if (shouldReleaseOnCleanup) {
        release(roomId);
      }
      setSession(null);
    };
  }, [roomId]);

  return session;
}
