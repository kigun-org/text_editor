import { yUndoPluginKey } from "y-prosemirror";
import type { EditorType } from "../blocks/schema";

function getUndoManager(editor: EditorType) {
  try {
    return yUndoPluginKey.getState(editor.prosemirrorView.state)?.undoManager;
  } catch {
    return undefined;
  }
}

/**
 * y-prosemirror destroys its UndoManager when the ProseMirror view is torn
 * down (e.g. React StrictMode remount) but can reuse plugin state that still
 * points at the destroyed manager. `destroy()` removes the afterTransaction
 * listener and drops the manager from `trackedOrigins` — without both, typing
 * is not captured and undo never fills the redo stack.
 */
export function ensureYUndoListening(editor: EditorType) {
  const undoManager = getUndoManager(editor);
  if (!undoManager) {
    return;
  }

  // Undo/redo transactions use the manager as origin; destroy() deletes it.
  undoManager.trackedOrigins.add(undoManager);

  undoManager.doc.off(
    "afterTransaction",
    undoManager.afterTransactionHandler,
  );
  undoManager.doc.on("afterTransaction", undoManager.afterTransactionHandler);
}

export function clearYUndoStack(editor: EditorType) {
  const undoManager = getUndoManager(editor);
  if (!undoManager) {
    return;
  }

  ensureYUndoListening(editor);
  undoManager.clear();
  undoManager.stopCapturing();
}

export function canYUndo(editor: EditorType): boolean {
  ensureYUndoListening(editor);
  return getUndoManager(editor)?.canUndo() ?? false;
}

export function canYRedo(editor: EditorType): boolean {
  ensureYUndoListening(editor);
  return getUndoManager(editor)?.canRedo() ?? false;
}

export function yUndo(editor: EditorType): boolean {
  ensureYUndoListening(editor);
  return editor.undo();
}

export function yRedo(editor: EditorType): boolean {
  ensureYUndoListening(editor);
  return editor.redo();
}
