import {
  BlockNoteSchema,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core";
import { createToothChart } from "./ToothChart";

export const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    toothChart: createToothChart(),
  },
});

export type EditorType = typeof schema.BlockNoteEditor;

export function insertToothChartItem(editor: EditorType) {
  return {
    title: "Tooth chart",
    subtext: "FDI chart with empty / missing / warning / error states",
    group: "Dental",
    aliases: ["tooth", "teeth", "chart", "dental", "odontogram"],
    onItemClick: () => {
      insertOrUpdateBlockForSlashMenu(editor, {
        type: "toothChart",
        props: { teeth: "0".repeat(32) },
      });
    },
  };
}
