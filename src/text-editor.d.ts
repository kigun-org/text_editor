export default class TextEditor {
  constructor(options: {
    target: HTMLElement;
    props?: Record<string, unknown>;
  });
  document: unknown[] | undefined;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  $destroy(): void;
}
