// Linear expressions in one variable: ax + b, with exact rational coefficients.
//
// GENERATOR_SPEC section 2: "Expression answers are compared by normalizing to a
// canonical polynomial." That is what this module is for — 2 + 3x and 3x + 2 are
// the same answer, and the parser has to say so.
//
// Pure. No Phaser, no DOM.

import type { Rational } from "./rational";
import { rat, add, sub, mul, neg, eq, toNumber, gcd, fmtImproper, MINUS } from "./rational";

export interface Linear {
  /** coefficient of the variable */
  a: Rational;
  /** constant term */
  b: Rational;
}

export const lin = (a: Rational, b: Rational): Linear => ({ a, b });
export const constant = (b: Rational): Linear => ({ a: rat(0), b });

export const addLinear = (p: Linear, q: Linear): Linear => ({ a: add(p.a, q.a), b: add(p.b, q.b) });
export const subLinear = (p: Linear, q: Linear): Linear => ({ a: sub(p.a, q.a), b: sub(p.b, q.b) });
export const scaleLinear = (k: Rational, p: Linear): Linear => ({ a: mul(k, p.a), b: mul(k, p.b) });
export const negLinear = (p: Linear): Linear => ({ a: neg(p.a), b: neg(p.b) });
export const eqLinear = (p: Linear, q: Linear): boolean => eq(p.a, q.a) && eq(p.b, q.b);
export const evaluate = (p: Linear, x: Rational): Rational => add(mul(p.a, x), p.b);

/* ----------------------------------------------------------- formatting */

/** A coefficient in front of a variable: 1x is x, -1x is −x, 1/2x keeps its fraction. */
function coefficient(a: Rational, v: string): string {
  if (eq(a, rat(1))) return v;
  if (eq(a, rat(-1))) return `${MINUS}${v}`;
  // Improper, not mixed: "4/3x" reads back, "1 1/3x" does not.
  return `${fmtImproper(a)}${v}`;
}

/**
 * Write the expression the way a card should: "3x + 2", "−2x + 12", "x", "5".
 * A zero coefficient drops the variable; a zero constant drops the constant.
 */
export function fmtLinear(p: Linear, v = "x"): string {
  const hasA = p.a.n !== 0;
  const hasB = p.b.n !== 0;
  if (!hasA && !hasB) return "0";
  if (!hasA) return fmtImproper(p.b);
  if (!hasB) return coefficient(p.a, v);
  const sign = p.b.n > 0 ? "+" : MINUS;
  const magnitude = fmtImproper(rat(Math.abs(p.b.n), p.b.d));
  return `${coefficient(p.a, v)} ${sign} ${magnitude}`;
}

/**
 * Join several expressions into one sum the way a person writes it: a term that
 * starts with a minus follows a minus sign, never "+ −".
 */
export function fmtSum(parts: readonly Linear[], v = "x"): string {
  return parts.reduce((text, p, i) => {
    const written = fmtLinear(p, v);
    if (i === 0) return written;
    return written.startsWith(MINUS)
      ? `${text} ${MINUS} ${written.slice(MINUS.length)}`
      : `${text} + ${written}`;
  }, "");
}

/** Wrapped in brackets, for the subtrahend of a difference. */
export const fmtBracketed = (p: Linear, v = "x"): string => `(${fmtLinear(p, v)})`;

/* -------------------------------------------------------------- parsing */

/** Accepts "3/4", "-3/4", "0.75", "2" — the coefficient forms a learner types. */
function parseCoefficient(raw: string): Rational | null {
  // Terms split out of an expression keep their sign, so "+3" arrives here as
  // often as "3" does.
  const s = raw.trim().replace(/−/g, "-").replace(/,/g, "").replace(/\s+/g, "").replace(/^\+/, "");
  if (s === "") return rat(1);
  if (s === "-") return rat(-1);

  let m = /^(-?\d+)\/(\d+)$/.exec(s);
  if (m) return Number(m[2]) === 0 ? null : rat(Number(m[1]), Number(m[2]));

  m = /^(-?)(\d*)\.(\d+)$/.exec(s);
  if (m) {
    const frac = m[3]!;
    const whole = m[2] === "" ? 0 : Number(m[2]);
    const value = rat(whole * 10 ** frac.length + Number(frac), 10 ** frac.length);
    return m[1] === "-" ? neg(value) : value;
  }

  if (/^-?\d+$/.test(s)) return rat(Number(s));
  return null;
}

/**
 * Parse an expression in one variable into ax + b.
 *
 * Handles "3x+2", "2+3x", "-x", "x", "5", "1/2x - 3", "0.5x+3" and any spacing.
 * Returns null on anything it does not understand, so a typo is a wrong answer
 * rather than a silently accepted one.
 */
export function parseLinear(raw: string, v = "x"): Linear | null {
  // The game renders thousands with commas, and a learner types them too.
  const s = raw.trim().replace(/−/g, "-").replace(/,/g, "").replace(/\s+/g, "");
  if (s === "") return null;
  if (!new RegExp(`^[-+0-9./${v}]+$`).test(s)) return null;

  // Split into signed terms without losing the sign.
  const terms: string[] = [];
  let current = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if ((c === "+" || c === "-") && i > 0 && s[i - 1] !== "/") {
      terms.push(current);
      current = c;
    } else {
      current += c;
    }
  }
  terms.push(current);

  let a = rat(0);
  let b = rat(0);
  for (const term of terms) {
    if (term === "" || term === "+" || term === "-") return null;
    if (term.includes(v)) {
      const parts = term.split(v);
      if (parts.length !== 2 || parts[1] !== "") return null; // "x3" or "xx"
      const c = parseCoefficient(parts[0]!);
      if (c === null) return null;
      a = add(a, c);
    } else {
      const c = parseCoefficient(term);
      if (c === null) return null;
      b = add(b, c);
    }
  }
  return { a, b };
}

/* ------------------------------------------------------------- factoring */

export interface Factored {
  /** the factor pulled out */
  g: Rational;
  inner: Linear;
}

/** Expand g(ax + b) back to a linear expression. */
export const expand = (f: Factored): Linear => scaleLinear(f.g, f.inner);

export const fmtFactored = (f: Factored, v = "x"): string => `${fmtImproper(f.g)}(${fmtLinear(f.inner, v)})`;

/** Parse "6(x + 2)", "-3(2x - 5)", "1/2(x + 3)". */
export function parseFactored(raw: string, v = "x"): Factored | null {
  const s = raw.trim().replace(/−/g, "-").replace(/,/g, "").replace(/\s+/g, "");
  const m = /^(-?[\d./]*)\((.+)\)$/.exec(s);
  if (!m) return null;
  const g = parseCoefficient(m[1]!);
  if (g === null || g.n === 0) return null;
  const inner = parseLinear(m[2]!, v);
  return inner === null ? null : { g, inner };
}

/**
 * The greatest common factor of ax + b, as a positive rational.
 *
 * For integer coefficients this is the ordinary GCD. For fractions it is
 * gcd(numerators) over lcm(denominators), which is the largest rational that
 * divides both and leaves whole numbers behind.
 */
export function gcfOf(p: Linear): Rational {
  if (p.a.n === 0 && p.b.n === 0) return rat(1);
  if (p.a.n === 0) return rat(Math.abs(p.b.n), p.b.d);
  if (p.b.n === 0) return rat(Math.abs(p.a.n), p.a.d);
  const numerator = gcd(Math.abs(p.a.n), Math.abs(p.b.n));
  const denominator = (p.a.d * p.b.d) / gcd(p.a.d, p.b.d); // lcm
  return rat(numerator, denominator);
}

/** Factor out the greatest common factor, keeping the sign of the leading term. */
export function factor(p: Linear): Factored {
  const magnitude = gcfOf(p);
  const g = toNumber(p.a) < 0 ? neg(magnitude) : magnitude;
  return { g, inner: scaleLinear(rat(g.d, g.n), p) };
}

/** True when `f` really is `target` fully factored, not just some factoring of it. */
export function isFullyFactored(f: Factored, target: Linear): boolean {
  if (!eqLinear(expand(f), target)) return false;
  const best = factor(target);
  return eq(rat(Math.abs(f.g.n), f.g.d), rat(Math.abs(best.g.n), best.g.d));
}
