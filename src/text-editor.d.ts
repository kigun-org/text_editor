export default class TextEditorElement extends HTMLElement {
  document: unknown[] | undefined;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
}
