// Which answer input a problem gets.
//
// Kept apart from the Phaser card so the decision can be tested without a
// browser. It is not decided by "does the problem carry options": generators
// attach distractor options to almost every problem so the error tags are
// available whichever input is shown, and treating options as "is a choice"
// served every numeric problem as four pick rows, leaving typed entry and the
// on-screen keypad unreachable. `format` decides.

import type { AnswerFormat } from "../../engine/types";

export type InputKind = "grid" | "order" | "pick" | "typed";

/** Formats whose answer is drawn on the figure rather than typed or picked. */
export const GRID_FORMATS = ["plot-point", "drag-line", "shade-region"] as const;

/** Formats the typed box can actually parse. */
export const TYPED_FORMATS = new Set<AnswerFormat>(["numeric", "fraction"]);

export function inputKindFor(format: AnswerFormat, hasOptions: boolean): InputKind {
  if ((GRID_FORMATS as readonly string[]).includes(format)) return "grid";
  if (format === "order") return "order";
  // Everything else with options is a choice: multiple-choice, pick-one,
  // yes-no, sci-notation, expression, table-fill and the read/select formats.
  if (!TYPED_FORMATS.has(format) && hasOptions) return "pick";
  return "typed";
}