import {
  BlockNoteSchema,
  defaultBlockSpecs,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core";
import { createElement } from "react";
import { createToothChart, ToothIcon } from "./ToothChart";

const { audio: _audio, file: _file, video: _video, ...blockSpecs } =
  defaultBlockSpecs;

export const schema = BlockNoteSchema.create({
  blockSpecs,
}).extend({
  blockSpecs: {
    toothChart: createToothChart(),
  },
});

export type EditorType = typeof schema.BlockNoteEditor;

export function insertToothChartItem(editor: EditorType) {
  return {
    title: "Tooth chart",
    subtext: "Tooth status overview (FDI notation).",
    group: "Other",
    aliases: ["tooth", "teeth", "chart", "dental", "odontogram"],
    icon: createElement(ToothIcon, { size: 18 }),
    onItemClick: () => {
      insertOrUpdateBlockForSlashMenu(editor, {
        type: "toothChart",
        props: { teeth: "0".repeat(32) },
      });
    },
  };
}
