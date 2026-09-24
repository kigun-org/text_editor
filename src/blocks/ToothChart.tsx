import {
  createReactBlockSpec,
  type ReactCustomBlockRenderProps,
} from "@blocknote/react";
import "./toothChart.css";
import { TOOTH_COUNT, toothChartConfig } from "./toothChartConfig";

export function ToothIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7,2C4,2 2,5 2,8C2,10.11 3,13 4,14C5,15 6,22 8,22C12.54,22 10,15 12,15C14,15 11.46,22 16,22C18,22 19,15 20,14C21,13 22,10.11 22,8C22,5 20,2 17,2C14,2 14,3 12,3C10,3 10,2 7,2Z" />
    </svg>
  );
}

export { EMPTY_TEETH, TOOTH_COUNT } from "./toothChartConfig";

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

/**
 * One character per tooth in `props.teeth` (32 chars, order matches QUADRANTS):
 * 0 = default, 1 = missing, 2 = warning, 3 = danger. Clicking cycles in that order.
 */
type ToothState = "0" | "1" | "2" | "3";

const NEXT_STATE: Record<ToothState, ToothState> = {
  "0": "1",
  "1": "2",
  "2": "3",
  "3": "0",
};

const STATE_LABEL: Record<ToothState, string> = {
  "0": "empty",
  "1": "missing",
  "2": "warning",
  "3": "danger",
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
            const missing = state === "1";
            const className = [
              "tooth-chart__cell",
              state === "2" ? "tooth-chart__cell--warning" : "",
              state === "3" ? "tooth-chart__cell--danger" : "",
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
