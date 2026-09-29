// Quantities the Grade 8 honors skills need that a Rational cannot hold: square
// roots and multiples of pi. A Quantity carries how it is written, what it is
// worth, and — when it is rational — the exact fraction behind it.
//
// Pure. h8.ns.a1 uses `rational` to answer "is this rational?"; h8.ns.a2 uses
// `value` to order a mixed list.

import type { Rational } from "./rational";
import { rat, toNumber, fmtFraction, add, mul, MINUS } from "./rational";

export interface Quantity {
  /** how the card writes it, in the app's math-text style */
  label: string;
  /** decimal worth, for ordering and estimating */
  value: number;
  /** the exact fraction when one exists; null means irrational */
  rational: Rational | null;
}

export const isPerfectSquare = (n: number): boolean => {
  if (n < 0) return false;
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
};

export function qRational(r: Rational): Quantity {
  return { label: fmtFraction(r), value: toNumber(r), rational: r };
}

export function qInteger(n: number): Quantity {
  return qRational(rat(n));
}

/** A decimal written as a decimal rather than reduced to a fraction. */
export function qDecimal(r: Rational, text: string): Quantity {
  return { label: text, value: toNumber(r), rational: r };
}

/** √n. Rational exactly when n is a perfect square. */
export function qSqrt(n: number): Quantity {
  return {
    label: `√${n}`,
    value: Math.sqrt(n),
    rational: isPerfectSquare(n) ? rat(Math.round(Math.sqrt(n))) : null,
  };
}

/** k·π, irrational for every non-zero k. */
export function qPi(k = 1): Quantity {
  return {
    label: k === 1 ? "π" : `${k}π`,
    value: k * Math.PI,
    rational: k === 0 ? rat(0) : null,
  };
}

/** a·√n + b, the shape h8.ns.a2 tier 4 asks for. */
export function qScaledSqrt(a: number, n: number, b: number): Quantity {
  const root = `√${n}`;
  const lead = a === 1 ? root : a === -1 ? `${MINUS}${root}` : `${a < 0 ? MINUS : ""}${Math.abs(a)}${root}`;
  const tail = b === 0 ? "" : b > 0 ? ` + ${b}` : ` ${MINUS} ${Math.abs(b)}`;
  const exact = isPerfectSquare(n) ? add(mul(rat(a), rat(Math.round(Math.sqrt(n)))), rat(b)) : null;
  return { label: `${lead}${tail}`, value: a * Math.sqrt(n) + b, rational: exact };
}

export const isIrrational = (q: Quantity): boolean => q.rational === null;

/** Ascending by worth; ties keep their given order. */
export function sortQuantities(qs: readonly Quantity[]): Quantity[] {
  return qs.map((q, i) => ({ q, i })).sort((a, b) => a.q.value - b.q.value || a.i - b.i).map((x) => x.q);
}

/* --------------------------------------------- repeating decimal to fraction */

/**
 * The x = 0.333…, 10x = 3.333…, subtract trick, done exactly.
 *
 * `whole.fixed` then `repeat` forever becomes
 *   (whole fixed repeat − whole fixed) / (10^|fixed|+|repeat| − 10^|fixed|)
 * which is the same subtraction the manual page walks through.
 */
export function repeatingToFraction(whole: string, fixed: string, repeat: string): Rational {
  const shifted = Number(`${whole}${fixed}${repeat}`);
  const base = Number(`${whole}${fixed}`);
  const denominator = 10 ** (fixed.length + repeat.length) - 10 ** fixed.length;
  return rat(shifted - base, denominator);
}

/** The power of ten the trick multiplies by: 10^(fixed + repeat) over 10^fixed. */
export function trickPowers(fixed: string, repeat: string): { high: number; low: number } {
  return { high: 10 ** (fixed.length + repeat.length), low: 10 ** fixed.length };
}

/* -------------------------------------------------- scientific notation */

export interface SciNotation {
  /** 1 <= |coefficient| < 10 */
  coefficient: number;
  exponent: number;
}

/** Normalise so the coefficient sits in [1, 10), which is what the input enforces. */
export function toSci(value: number, decimals = 2): SciNotation {
  if (!Number.isFinite(value) || value === 0) return { coefficient: 0, exponent: 0 };
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  // Below about 1e-308 the divisor itself underflows to zero, so scale in two
  // steps. The registry only ever asks for exponents in [-9, 12], but a helper
  // that returns Infinity for a denormal is a trap for whoever reuses it.
  const scaled = exponent < -300
    ? (value * 10 ** 300) / 10 ** (exponent + 300)
    : value / 10 ** exponent;
  const coefficient = Number(scaled.toFixed(decimals));
  // Rounding 9.999 to 2 places gives 10, which is out of range; carry it.
  if (Math.abs(coefficient) >= 10) return { coefficient: coefficient / 10, exponent: exponent + 1 };
  return { coefficient, exponent };
}

export function fromSci(s: SciNotation): number {
  return s.coefficient * 10 ** s.exponent;
}

/** Superscript digits, so exponents render without a separate text style. */
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";

export function superscript(n: number): string {
  const digits = String(Math.abs(n)).split("").map((d) => SUP[Number(d)]!).join("");
  return (n < 0 ? "⁻" : "") + digits;
}

export function fmtSci(s: SciNotation): string {
  const c = s.coefficient;
  const text = Number.isInteger(c) ? String(c) : String(c);
  return `${text.replace("-", MINUS)} × 10${superscript(s.exponent)}`;
}

export function fmtPower(base: number | string, exponent: number): string {
  // x^1 is written x, the way anyone writes it.
  if (exponent === 1) return String(base);
  return `${base}${superscript(exponent)}`;
}

export const sciEqual = (a: SciNotation, b: SciNotation): boolean =>
  Math.abs(fromSci(a) - fromSci(b)) < Math.abs(fromSci(b)) * 1e-9 + 1e-12;
