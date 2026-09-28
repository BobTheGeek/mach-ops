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

export type FigureKind =
  | "number-line" | "vertical-number-line" | "zero-pairs" | "debt-table"
  | "coordinate-plane" | "table" | "tape" | "hanger" | "area-model"
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
