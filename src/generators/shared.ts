// Helpers every generator uses. Keeps the five Chapter 1 generators to the shape
// of content/examples/generators/ns.1.4.ts without repeating the choice-building
// and answer-equivalence logic five times.
//
// Pure. The only randomness is the seeded rng handed in by the caller.

import { shuffle } from "../engine/rng";
import type { Answer, Distractor } from "../engine/types";
import type { Rational } from "../engine/rational";
import { eq, isRational, parseRational, rat, add, mul, toNumber } from "../engine/rational";

export const OPTION_COUNT = 4;
export const DISTRACTOR_COUNT = OPTION_COUNT - 1;

/**
 * A candidate wrong answer plus the registry error tag that produces it.
 *
 * `value` may be a thunk. A recipe that only makes sense for some variants often
 * cannot even be *computed* for the others — dividing by a quantity that is zero
 * elsewhere, for instance — and an eager value would throw before `when` was
 * ever read. A thunk is evaluated only after the guard passes.
 */
export interface Candidate {
  tag: string;
  value: Answer | (() => Answer);
  /** skip this recipe when it does not apply to the drawn variant */
  when?: boolean;
}

function sameAnswer(a: Answer, b: Answer): boolean {
  if (isRational(a) && isRational(b)) return eq(a, b);
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => sameAnswer(x, b[i]!));
  }
  return a === b;
}

/** True when a Choice has enough distinct options to be worth showing. */
export const isUsableChoice = (c: Choice): boolean => c.options.length >= 2;

export interface Choice {
  distractors: Distractor[];
  options: Answer[];
  optionText: string[];
  correctIndex: number;
  errorTagsByAnswer: Record<string, string>;
}

/**
 * Build exactly 3 distractors from registry error recipes, then lay out 4 options
 * with the correct one at a seed-drawn position.
 *
 * Recipes that collide with the correct answer or with each other fall through to
 * the next tag; if fewer than 3 survive, the spec's "magnitude" fallback fills in.
 * Never a random number: every wrong option must be reachable by a real mistake.
 */
export function buildChoice(
  rng: () => number,
  correct: Answer,
  candidates: readonly Candidate[],
  fmt: (a: Answer) => string,
  optionCount: number = OPTION_COUNT,
): Choice {
  const wanted = optionCount - 1;
  const distractors: Distractor[] = [];

  for (const c of candidates) {
    if (c.when === false) continue;
    const value = typeof c.value === "function" ? (c.value as () => Answer)() : c.value;
    if (sameAnswer(value, correct)) continue;
    if (distractors.some((d) => sameAnswer(d.value, value))) continue;
    distractors.push({ tag: c.tag, value });
    if (distractors.length === wanted) break;
  }

  // The spec's magnitude fallback only means something for a number: "correct x2"
  // or "correct +/- 10". For a written answer there is no such neighbour, and
  // padding one with whitespace would put a visibly broken option on the card,
  // so a short recipe list simply yields a narrower set of options.
  if (typeof correct !== "string") {
    let bump = 0;
    let guard = 0;
    while (distractors.length < wanted && guard++ < 20) {
      const value = magnitudeFallback(correct, bump++);
      if (sameAnswer(value, correct)) continue;
      if (distractors.some((d) => sameAnswer(d.value, value))) continue;
      distractors.push({ tag: "magnitude", value });
    }
  }

  const order = shuffle(rng, [correct, ...distractors.map((d) => d.value)]);
  const correctIndex = order.findIndex((o) => sameAnswer(o, correct));

  return {
    distractors,
    options: order,
    optionText: order.map(fmt),
    correctIndex,
    errorTagsByAnswer: Object.fromEntries(distractors.map((d) => [fmt(d.value), d.tag])),
  };
}

/** The spec's fallback: correct x2, correct / 2, correct +/- 10. */
function magnitudeFallback(correct: Exclude<Answer, string>, i: number): Answer {
  if (isRational(correct)) {
    // An integer problem never gets a fractional option: the form itself would
    // be the cue. Halving is only offered where the answer is already fractional.
    const steps: Rational[] = correct.d === 1
      ? [mul(correct, rat(2)), add(correct, rat(10)), add(correct, rat(-10)), add(correct, rat(1)), add(correct, rat(2))]
      : [mul(correct, rat(2)), mul(correct, rat(1, 2)), add(correct, rat(10)), add(correct, rat(-10)), add(correct, rat(1))];
    return steps[i % steps.length]!;
  }
  if (typeof correct === "number") {
    const steps = [correct * 2, correct + 10, correct - 10, correct + 1, correct + 2];
    return steps[i % steps.length]!;
  }
  // An ordered answer has no magnitude neighbour either; return it unchanged so
  // the caller's duplicate check drops it and the option set stays honest.
  return correct;
}

/* --------------------------------------------------------- acceptance */

/**
 * Equivalence, not string match: 3/4, 0.75 and 75% are the same answer, and
 * "-3,500" is the same as -3500.
 */
export function acceptRational(correct: Rational): (input: Answer) => boolean {
  return (input: Answer): boolean => {
    const r = coerce(input);
    return r !== null && eq(r, correct);
  };
}

export function coerce(input: Answer): Rational | null {
  if (isRational(input)) return input;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    if (Number.isInteger(input)) return rat(input);
    // A typed decimal is exact to the places the player wrote.
    const places = (String(input).split(".")[1] ?? "").length;
    return rat(Math.round(input * 10 ** places), 10 ** places);
  }
  if (typeof input === "string") return parseRational(input);
  return null;
}

/** Ordered answers: compare element by element after coercion. */
export function acceptOrder(correct: readonly Rational[]): (input: Answer) => boolean {
  return (input: Answer): boolean => {
    if (!Array.isArray(input) || input.length !== correct.length) return false;
    return input.every((x, i) => {
      const r = coerce(x);
      return r !== null && eq(r, correct[i]!);
    });
  };
}

/* -------------------------------------------------------- skin binding */

/** Replace {{name}} slots with formatted params. Skins never change the numbers. */
export function bind(template: string, slots: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (all, key: string) => slots[key] ?? all);
}

/** Number-line figure bounds that always contain the drawn values and zero. */
export function numberLineSpan(values: readonly number[], pad = 5): { min: number; max: number } {
  const all = [...values, 0];
  return { min: Math.floor(Math.min(...all)) - pad, max: Math.ceil(Math.max(...all)) + pad };
}

export const asNumber = (r: Rational): number => toNumber(r);
