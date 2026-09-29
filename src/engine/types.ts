// The Problem contract from content/GENERATOR_SPEC.md section 2, plus the
// attempt log and per-skill state from docs/engine-rules.md.
//
// Pure types and the Attempt record only — no Phaser, no DOM.

import type { Rational } from "./rational";

export type Tier = 1 | 2 | 3 | 4;

export type AnswerFormat =
  | "numeric" | "fraction" | "sci-notation" | "expression"
  | "multiple-choice" | "yes-no" | "order" | "table-fill"
  | "plot-point" | "drag-line" | "shade-region" | "number-line-select"
  | "graph-select" | "shape-select" | "box-plot-read" | "likelihood-select"
  | `pick-one:${string}`;

/**
 * A canonical answer. Rationals cover every numeric skill exactly; `order`
 * answers are arrays; the string form is for expression and pick-one answers.
 */
export type Answer = number | string | Rational | Answer[];

export interface Distractor {
  value: Answer;
  /** a registry errors[].tag, or "magnitude" for the spec's fallback */
  tag: string;
}

export interface WorkedStep {
  text: string;
  /** display math in the app's math-text style (MK-0) */
  math?: string;
}

/**
 * Figure names are the registry's own `reps` strings, so a generator can name
 * what the Math Kit should draw without a translation table. The union grows one
 * chapter at a time: these are the reps Chapters 1-2 and the Q1 honors skills
 * use. GENERATOR_SPEC section 9 lists the full vocabulary.
 */
export type FigureKind =
  // Chapter 1
  | "number-line" | "vertical-number-line" | "zero-pairs" | "debt-table"
  // Chapter 2
  | "velocity-time" | "fact-family" | "long-division" | "area-model" | "tape-diagram"
  // Chapters 3-4
  | "tiles" | "area-model-reverse" | "add-the-opposite" | "balance-table" | "test-point"
  // Chapters 5-6
  | "ratio-table" | "double-number-line" | "arrow-table" | "y=kx" | "table-graph-equation"
  | "scale-drawing" | "grid" | "scale-bar" | "hundred-grid" | "part-whole-bar" | "tape-diagram-100"
  // Q1 honors
  | "powers-of-ten-line" | "bracketing" | "expanded-form" | "place-value-shift"
  | "square-and-cube-models" | "algebra-trick-10x" | "vertical-format" | "equation"
  | "hanger-diagram"
  // later chapters
  | "coordinate-plane" | "table" | "tape" | "hanger"
  | "tree" | "box-plot" | "dot-plot" | "angle" | "net" | "solid"
  | "scale-drawing" | "scatter" | "two-way-table";

/** Figures are described by data; the Math Kit component draws them. */
export interface FigureSpec {
  kind: FigureKind;
  min?: number;
  max?: number;
  points?: number[];
  labels?: string[];
  rows?: (string | number)[][];
  [k: string]: unknown;
}

export interface PromptSpec {
  /** may contain {{slots}} bound from params */
  text: string;
  /** display-math lines */
  math?: string[];
  figure?: FigureSpec;
  units?: string;
}

export interface Problem {
  skill: string;
  tier: Tier;
  seed: number;
  /** sha1 of skill|tier|variant|canonical params — the no-repeat key */
  hash: string;
  format: AnswerFormat;
  prompt: PromptSpec;
  answer: Answer;
  /** equivalence check: 3/4 == 0.75 == 75% */
  accept: (input: Answer) => boolean;
  /** exactly 3 for multiple-choice and pick-one formats */
  distractors?: Distractor[];
  /**
   * Choice formats only: the 4 options in display order, and the index of the
   * correct one. GENERATOR_SPEC section 4 requires the correct position to be
   * drawn from the seed and tested for a 20-30% distribution per slot, which
   * needs the laid-out order, not just the distractor set.
   */
  options?: Answer[];
  correctIndex?: number;
  /**
   * The canonical answer as the game draws it, in the app's math-text style.
   * GENERATOR_SPEC section 4 requires option text to be formatted identically to
   * the correct answer, so the formatted form has to leave the generator with it.
   */
  answerText: string;
  optionText?: string[];
  /**
   * `order` format only: how each item in `answer` should be written. An
   * irrational has to read as "√40" rather than as its decimal, and the reorder
   * input has no other way to know that.
   */
  orderLabels?: string[];
  /** one step per numbered step in the manual's "How to solve it" */
  worked: WorkedStep[];
  /** formatted wrong-answer text -> registry error tag */
  errorTagsByAnswer: Record<string, string>;
  /** the raw draw, for logging and replay */
  params: Record<string, number | string>;
}

export interface GenerateOpts {
  skin?: string;
  transfer?: boolean;
}

export type Generator = (tier: Tier, seed: number, opts?: GenerateOpts) => Problem;

/* ------------------------------------------------------- progression */

export type AttemptContext = "briefing" | "sortie" | "transfer";

export interface Attempt {
  skill: string;
  tier: Tier;
  correct: boolean;
  responseMs: number;
  /** manual opens and HINT presses */
  hintsUsed: number;
  context: AttemptContext;
  /** distractor tag the student picked, e.g. "double-neg" */
  errorTag?: string;
  /** epoch ms */
  ts: number;
}

export type EngineState = "new" | "learning" | "fluent" | "mastered";

/** The avionics wording the UI shows for each engine state. */
export type SystemsStatus = "OFFLINE" | "CALIBRATING" | "ONLINE" | "OPTIMIZED";

export const STATUS_BY_STATE: Record<EngineState, SystemsStatus> = {
  new: "OFFLINE",
  learning: "CALIBRATING",
  fluent: "ONLINE",
  mastered: "OPTIMIZED",
};

export interface SkillState {
  skill: string;
  tier: Tier;
  score: number;
  state: EngineState;
  status: SystemsStatus;
  attempts: number;
  transferCorrect: number;
  /** spaced repetition, in days */
  intervalDays: number;
  /** epoch ms; 0 when the skill has never been attempted */
  nextDue: number;
  lastAttempt: number;
}
