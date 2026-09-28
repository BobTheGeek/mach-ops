// Registry representation -> Math Kit component, and registry answer format ->
// Answer Input component. Both tables are DESIGN_RECONCILIATION.md sections 2 and 3.
//
// The registry strings stay as they are; these ids are what the renderer asks for.

import type { AnswerFormat } from "./types";

export type MathKitId = "MK-0" | "MK-1" | "MK-2" | "MK-3" | "MK-4" | "MK-5" | "MK-6" | "MK-7" | "MK-8";

export const MATH_KIT_NAME: Record<MathKitId, string> = {
  "MK-0": "Math text (manual illustration, not a live figure)",
  "MK-1": "Number lines",
  "MK-2": "Coordinate plane",
  "MK-3": "Tables",
  "MK-4": "Models",
  "MK-5": "Probability",
  "MK-6": "Statistics",
  "MK-7": "Geometry",
  "MK-8": "Solids and nets",
};

const MK_MEMBERS: Record<MathKitId, readonly string[]> = {
  "MK-1": ["number-line", "vertical-number-line", "zero-pairs", "likelihood-line", "powers-of-ten-line", "bracketing"],
  "MK-2": ["coordinate-plane", "coordinate-plane-two-lines", "coordinate-plane-shaded", "coordinate-plane-sketch",
    "coordinate-plane-right-triangle", "table-graph-equation", "C-vs-d-graph", "slope-triangle", "dilation-pair",
    "scatter-plot", "scatter-plot-with-line"],
  "MK-3": ["ratio-table", "arrow-table", "two-way-table", "function table", "data table", "proportion-table",
    "balance-table", "frequency-table", "debt-table", "fact-family", "outcome-table", "table"],
  "MK-4": ["tape-diagram", "tape-diagram-100", "part-whole-bar", "double-number-line", "hanger-diagram",
    "area-model", "area-model-reverse", "mapping-diagram", "tiles", "tape", "hanger"],
  "MK-5": ["tree-diagram", "organized-list", "sample-space-list", "spinner", "dice", "simulation", "tree"],
  "MK-6": ["dot-plot", "quartile-marks", "skew-vs-symmetric", "box-plot", "parallel-dot-plots",
    "side-by-side-box-plots", "dot-plot-of-sample-means", "population-sample-diagram"],
  "MK-7": ["angle-diagram", "transversal-diagram", "circle-labelled", "grid-decomposition", "scale-drawing",
    "scale-bar", "grid", "right-triangle-labelled", "squares-on-sides", "straws", "compass-construction", "angle"],
  "MK-8": ["solids-labelled", "net", "can-label-net", "layers-of-cubes", "base-times-height", "slice-visual",
    "square-and-cube-models", "solid"],
  // Not problem figures: these are Flight Manual illustrations drawn in MK-0 style.
  // "y=kx" (rp.5.4) and "words" (h8.f.a2) appear in the registry but are absent
  // from the DESIGN_RECONCILIATION.md table; both are text, not figures, so they
  // sit with "equation" here. Raised in docs/PHASE1-NOTES.md.
  "MK-0": ["long-division", "expanded-form", "place-value-shift", "algebra-trick-10x", "hundred-grid",
    "wedges-to-parallelogram", "pour-demo", "velocity-time", "vertical-format", "add-the-opposite",
    "test-point", "equation", "y=kx", "words"],
};

const REP_TO_MK = new Map<string, MathKitId>();
for (const [id, reps] of Object.entries(MK_MEMBERS) as [MathKitId, readonly string[]][]) {
  for (const rep of reps) REP_TO_MK.set(rep, id);
}

/** null when the representation is not in the reconciliation table at all. */
export function mathKitFor(rep: string): MathKitId | null {
  return REP_TO_MK.get(rep) ?? null;
}

export type AnswerInputId = "CL-02" | "CL-02-expr" | "AI-1" | "AI-2" | "AI-3" | "AI-4" | "AI-5" | "AI-6" | "AI-7" | "AI-8";

export const ANSWER_INPUT_NAME: Record<AnswerInputId, string> = {
  "CL-02": "Problem card input",
  "CL-02-expr": "Problem card input, expression mode",
  "AI-1": "Fraction input",
  "AI-2": "Scientific notation input",
  "AI-3": "Plot / drag a point",
  "AI-4": "Drag a line",
  "AI-5": "Shade region",
  "AI-6": "Pick one of N",
  "AI-7": "Reorder",
  "AI-8": "Fill a table cell",
};

/**
 * number-line-select keeps its registry name; the renderer picks AI-6 when the
 * answer is a point and AI-5 when it is a region. Without that context AI-6 is
 * the safe default.
 */
export function answerInputFor(format: AnswerFormat): AnswerInputId {
  if (format.startsWith("pick-one:")) return "AI-6";
  switch (format) {
    case "numeric": return "CL-02";
    case "expression": return "CL-02-expr";
    case "fraction": return "AI-1";
    case "sci-notation": return "AI-2";
    case "plot-point": return "AI-3";
    case "drag-line": return "AI-4";
    case "shade-region": return "AI-5";
    case "order": return "AI-7";
    case "table-fill": return "AI-8";
    case "multiple-choice":
    case "yes-no":
    case "graph-select":
    case "shape-select":
    case "likelihood-select":
    case "box-plot-read":
    case "number-line-select":
      return "AI-6";
    default:
      // The pick-one:\${string} arm of AnswerFormat is handled above; anything
      // else new lands on the generic picker until it gets its own component.
      return "AI-6";
  }
}
