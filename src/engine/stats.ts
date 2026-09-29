// Chapter 7 and 8 statistics, in exact rational arithmetic.
//
// Every measure here is defined on Rationals rather than numbers, for the same
// reason the rest of the engine is: a mean of 1/3 must stay 1/3, and a MAD
// computed in floating point drifts far enough to make two cards disagree about
// which squadron is more consistent.
//
// The quartile convention is the registry's own, stated in sp.7.4: "Sort, split
// at the median, Q1 and Q3 are the medians of each half." On an odd count the
// median is EXCLUDED from both halves — including it is the skill's own
// `quartile-includes-median` error tag, so the engine must not make that mistake.

import type { Rational } from "./rational";
import { rat, add, sub, abs, div0, cmp, eq } from "./rational";

export const sortAsc = (values: readonly Rational[]): Rational[] =>
  [...values].sort((a, b) => cmp(a, b));

export function sum(values: readonly Rational[]): Rational {
  return values.reduce<Rational>((acc, v) => add(acc, v), rat(0));
}

export function mean(values: readonly Rational[]): Rational {
  if (values.length === 0) throw new Error("mean of an empty set");
  return div0(sum(values), rat(values.length));
}

/** Median of an already-sorted list. Averages the two middles on an even count. */
function medianOfSorted(s: readonly Rational[]): Rational {
  if (s.length === 0) throw new Error("median of an empty set");
  const mid = Math.floor(s.length / 2);
  if (s.length % 2 === 1) return s[mid]!;
  return div0(add(s[mid - 1]!, s[mid]!), rat(2));
}

export function median(values: readonly Rational[]): Rational {
  return medianOfSorted(sortAsc(values));
}

/**
 * Every most-frequent value, in ascending order. Empty when no value repeats:
 * "no mode" is a real answer the registry asks for at tier 2, not a missing one.
 */
export function modes(values: readonly Rational[]): Rational[] {
  const seen: { value: Rational; count: number }[] = [];
  for (const v of values) {
    const hit = seen.find((s) => eq(s.value, v));
    if (hit) hit.count += 1;
    else seen.push({ value: v, count: 1 });
  }
  const top = Math.max(0, ...seen.map((s) => s.count));
  if (top < 2) return [];
  return sortAsc(seen.filter((s) => s.count === top).map((s) => s.value));
}

export interface FiveNumber {
  min: Rational;
  q1: Rational;
  median: Rational;
  q3: Rational;
  max: Rational;
}

export function fiveNumber(values: readonly Rational[]): FiveNumber {
  const s = sortAsc(values);
  if (s.length < 4) throw new Error("a five-number summary needs at least 4 values");
  const mid = Math.floor(s.length / 2);
  // Odd count: the median belongs to neither half.
  const lower = s.slice(0, mid);
  const upper = s.length % 2 === 1 ? s.slice(mid + 1) : s.slice(mid);
  return {
    min: s[0]!,
    q1: medianOfSorted(lower),
    median: medianOfSorted(s),
    q3: medianOfSorted(upper),
    max: s[s.length - 1]!,
  };
}

export const q1 = (values: readonly Rational[]): Rational => fiveNumber(values).q1;
export const q3 = (values: readonly Rational[]): Rational => fiveNumber(values).q3;

export function iqr(values: readonly Rational[]): Rational {
  const f = fiveNumber(values);
  return sub(f.q3, f.q1);
}

export function range(values: readonly Rational[]): Rational {
  const s = sortAsc(values);
  if (s.length === 0) throw new Error("range of an empty set");
  return sub(s[s.length - 1]!, s[0]!);
}

/** Mean absolute deviation: the average distance from the mean. */
export function mad(values: readonly Rational[]): Rational {
  const m = mean(values);
  return div0(sum(values.map((v) => abs(sub(v, m)))), rat(values.length));
}

/**
 * The quartile mistake the registry names: including the median in both halves
 * on an odd count. Exported so a generator can produce the distractor without
 * re-deriving it, and so the difference is testable.
 */
export function quartilesIncludingMedian(values: readonly Rational[]): { q1: Rational; q3: Rational } {
  const s = sortAsc(values);
  const mid = Math.floor(s.length / 2);
  const lower = s.length % 2 === 1 ? s.slice(0, mid + 1) : s.slice(0, mid);
  const upper = s.slice(mid);
  return { q1: medianOfSorted(lower), q3: medianOfSorted(upper) };
}

/** Shape of a distribution, for sp.7.5. */
export type Shape = "symmetric" | "left-skewed" | "right-skewed";

/**
 * Which way a set leans, from where the mean sits relative to the median.
 * A tail to the right drags the mean above the median, and that is exactly the
 * comparison sp.7.5 asks the player to make.
 */
export function shapeOf(values: readonly Rational[]): Shape {
  const c = cmp(mean(values), median(values));
  return c === 0 ? "symmetric" : c > 0 ? "right-skewed" : "left-skewed";
}
