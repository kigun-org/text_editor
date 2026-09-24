// The Hocuspocus server (realtime/src/schema.js) imports this file to convert
// notes between JSON and Yjs. Keep it plain JavaScript with no imports.

export const TOOTH_COUNT = 32;
export const EMPTY_TEETH = "0".repeat(TOOTH_COUNT);

export const toothChartConfig = {
  type: "toothChart",
  propSchema: {
    teeth: {
      default: EMPTY_TEETH,
    },
  },
  content: "none",
};
