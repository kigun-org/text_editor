import {
  blockHasType,
  type BlockSchema,
  type InlineContentSchema,
  type StyleSchema,
} from "@blocknote/core";
import {
  FilePanelController,
  UploadTab,
  useBlockNoteEditor,
  useComponentsContext,
  useDictionary,
  useEditorDOMElement,
  useEditorState,
  type FilePanelProps,
} from "@blocknote/react";
import { useEffect, useMemo, useState } from "react";
import { applyGalleryImage, GalleryPicker } from "./GalleryTab";

function useEditorWidth() {
  const editorDom = useEditorDOMElement();
  const [width, setWidth] = useState<number>();

  useEffect(() => {
    if (!editorDom) return;
    const update = () => setWidth(editorDom.getBoundingClientRect().width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(editorDom);
    return () => observer.disconnect();
  }, [editorDom]);

  return width;
}

export function EditorFilePanel({ blockId }: FilePanelProps) {
  const Components = useComponentsContext()!;
  const editor = useBlockNoteEditor();
  const dict = useDictionary();
  const editorWidth = useEditorWidth();
  const [loading, setLoading] = useState(false);
  const block = editor.getBlock(blockId);
  const isImage = block?.type === "image";

  const tabs = useMemo(() => {
    if (isImage) return [];
    if (editor.uploadFile === undefined) return [];
    return [
      {
        name: dict.file_panel.upload.title,
        tabPanel: <UploadTab blockId={blockId} setLoading={setLoading} />,
      },
    ];
  }, [blockId, dict, editor.uploadFile, isImage]);

  const [openTab, setOpenTab] = useState(tabs[0]?.name || "");

  if (isImage) {
    return (
      <div
        className="bn-panel image-gallery-panel"
        style={editorWidth ? { width: editorWidth * 0.9 } : undefined}
      >
        <GalleryPicker
          onSelect={(image) => applyGalleryImage(editor, blockId, image)}
        />
      </div>
    );
  }

  if (tabs.length === 0) {
    return null;
  }

  return (
    <Components.FilePanel.Root
      className="bn-panel"
      defaultOpenTab={openTab}
      openTab={openTab}
      setOpenTab={setOpenTab}
      tabs={tabs}
      loading={loading}
    />
  );
}

export function EditorFilePanelController() {
  return <FilePanelController filePanel={EditorFilePanel} />;
}

function ReplaceIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M5 4h8a3 3 0 0 1 3 3v2h-2V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2v2H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3m6 6h8a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3m1 2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1z" />
    </svg>
  );
}

export function EditorFileReplaceButton() {
  const dict = useDictionary();
  const Components = useComponentsContext()!;
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const block = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor.isEditable) return undefined;
      const selectedBlocks = editor.getSelection()?.blocks || [
        editor.getTextCursorPosition().block,
      ];
      if (selectedBlocks.length !== 1) return undefined;
      const selected = selectedBlocks[0];
      if (
        !blockHasType(selected, editor, selected.type, {
          url: "string",
        })
      ) {
        return undefined;
      }
      return selected;
    },
  });

  if (block === undefined) {
    return null;
  }

  return (
    <Components.Generic.Popover.Root position="bottom">
      <Components.Generic.Popover.Trigger>
        <Components.FormattingToolbar.Button
          className="bn-button"
          mainTooltip={
            dict.formatting_toolbar.file_replace.tooltip[block.type] ||
            dict.formatting_toolbar.file_replace.tooltip.file
          }
          label={
            dict.formatting_toolbar.file_replace.tooltip[block.type] ||
            dict.formatting_toolbar.file_replace.tooltip.file
          }
          icon={<ReplaceIcon />}
        />
      </Components.Generic.Popover.Trigger>
      <Components.Generic.Popover.Content
        className="bn-popover-content bn-panel-popover"
        variant="panel-popover"
      >
        <EditorFilePanel blockId={block.id} />
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
}
