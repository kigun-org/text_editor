import {
  createReactBlockSpec,
  type ReactCustomBlockRenderProps,
} from "@blocknote/react";
import "./toothChart.css";

export const TOOTH_COUNT = 32;
export const EMPTY_TEETH = "0".repeat(TOOTH_COUNT);

/** Clinician view, FDI permanent dentition. Storage order matches visual order. */
const QUADRANTS = [
  // Q1 upper right (patient's right)
  [
    { fdi: 18, pos: 8 },
    { fdi: 17, pos: 7 },
    { fdi: 16, pos: 6 },
    { fdi: 15, pos: 5 },
    { fdi: 14, pos: 4 },
    { fdi: 13, pos: 3 },
    { fdi: 12, pos: 2 },
    { fdi: 11, pos: 1 },
  ],
  // Q2 upper left
  [
    { fdi: 21, pos: 1 },
    { fdi: 22, pos: 2 },
    { fdi: 23, pos: 3 },
    { fdi: 24, pos: 4 },
    { fdi: 25, pos: 5 },
    { fdi: 26, pos: 6 },
    { fdi: 27, pos: 7 },
    { fdi: 28, pos: 8 },
  ],
  // Q4 lower right
  [
    { fdi: 48, pos: 8 },
    { fdi: 47, pos: 7 },
    { fdi: 46, pos: 6 },
    { fdi: 45, pos: 5 },
    { fdi: 44, pos: 4 },
    { fdi: 43, pos: 3 },
    { fdi: 42, pos: 2 },
    { fdi: 41, pos: 1 },
  ],
  // Q3 lower left
  [
    { fdi: 31, pos: 1 },
    { fdi: 32, pos: 2 },
    { fdi: 33, pos: 3 },
    { fdi: 34, pos: 4 },
    { fdi: 35, pos: 5 },
    { fdi: 36, pos: 6 },
    { fdi: 37, pos: 7 },
    { fdi: 38, pos: 8 },
  ],
] as const;

type ToothState = "0" | "1" | "2" | "3";

const NEXT_STATE: Record<ToothState, ToothState> = {
  "0": "3",
  "3": "1",
  "1": "2",
  "2": "0",
};

const STATE_LABEL: Record<ToothState, string> = {
  "0": "empty",
  "1": "warning",
  "2": "danger",
  "3": "missing",
};

function normalizeTeeth(value: string): string {
  const chars = value.padEnd(TOOTH_COUNT, "0").slice(0, TOOTH_COUNT).split("");
  return chars
    .map((char) =>
      char === "1" || char === "2" || char === "3" ? char : "0",
    )
    .join("");
}

function toothStateAt(teeth: string, index: number): ToothState {
  const char = teeth[index];
  return char === "1" || char === "2" || char === "3" ? char : "0";
}

const toothChartConfig = {
  type: "toothChart" as const,
  propSchema: {
    teeth: {
      default: EMPTY_TEETH,
    },
  },
  content: "none" as const,
};

function ToothChartView(
  props: ReactCustomBlockRenderProps<typeof toothChartConfig>,
) {
  const teeth = normalizeTeeth(props.block.props.teeth);

  const cycle = (index: number) => {
    if (!props.editor.isEditable) {
      return;
    }

    const next = teeth.split("");
    next[index] = NEXT_STATE[toothStateAt(teeth, index)];

    props.editor.updateBlock(props.block, {
      type: "toothChart",
      props: { teeth: next.join("") },
    });
  };

  return (
    <div
      className={
        props.editor.isEditable
          ? "tooth-chart"
          : "tooth-chart tooth-chart--readonly"
      }
      contentEditable={false}
    >
      {QUADRANTS.map((quadrant, quadrantIndex) => (
        <div key={quadrantIndex} className="tooth-chart__quadrant">
          {quadrant.map((tooth, toothIndex) => {
            const index = quadrantIndex * 8 + toothIndex;
            const state = toothStateAt(teeth, index);
            const missing = state === "3";
            const className = [
              "tooth-chart__cell",
              state === "1" ? "tooth-chart__cell--warning" : "",
              state === "2" ? "tooth-chart__cell--danger" : "",
              missing ? "tooth-chart__cell--missing" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                key={tooth.fdi}
                type="button"
                className={className}
                data-state={state}
                aria-label={`Tooth ${tooth.fdi}, ${STATE_LABEL[state]}`}
                title={`${tooth.fdi} (${STATE_LABEL[state]})`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => cycle(index)}
              >
                {missing ? "×" : tooth.pos}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export const createToothChart = createReactBlockSpec(toothChartConfig, {
  render: ToothChartView,
});
