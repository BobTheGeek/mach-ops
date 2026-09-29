// Inequalities in one variable: x <symbol> boundary.
//
// docs/design.md math text style: the glyphs are <, ≤, >, ≥. Never "<=".
//
// Pure. The flip rule — multiplying or dividing by a negative reverses the
// symbol — lives here so every Chapter 4 generator applies it the same way.

import type { Rational } from "./rational";
import { rat, cmp, toNumber, fmtImproper, div0 } from "./rational";

export type Relation = "lt" | "le" | "gt" | "ge";

export const GLYPH: Record<Relation, string> = { lt: "<", le: "≤", gt: ">", ge: "≥" };

export interface Inequality {
  relation: Relation;
  /** the value on the other side of the symbol from the variable */
  boundary: Rational;
}

export const ineq = (relation: Relation, boundary: Rational): Inequality => ({ relation, boundary });

/** Reverse the symbol. Multiplying or dividing by a negative needs this. */
export const flip = (r: Relation): Relation =>
  r === "lt" ? "gt" : r === "gt" ? "lt" : r === "le" ? "ge" : "le";

export const isStrict = (r: Relation): boolean => r === "lt" || r === "gt";
/** Closed circle for <= and >=, open for < and >. */
export const isClosed = (r: Relation): boolean => !isStrict(r);
/** Shade right for > and >=, left for < and <=. */
export const shadesRight = (r: Relation): boolean => r === "gt" || r === "ge";

export function satisfies(i: Inequality, x: Rational): boolean {
  const c = cmp(x, i.boundary);
  switch (i.relation) {
    case "lt": return c < 0;
    case "le": return c <= 0;
    case "gt": return c > 0;
    case "ge": return c >= 0;
  }
}

export const eqInequality = (a: Inequality, b: Inequality): boolean =>
  a.relation === b.relation && cmp(a.boundary, b.boundary) === 0;

/**
 * Improper, not mixed. "x ≥ 2 1/4" loses its space in any input box and reads
 * back as 21/4, so the boundary is always written as a single fraction.
 */
export const fmtInequality = (i: Inequality, v = "x"): string =>
  `${v} ${GLYPH[i.relation]} ${fmtImproper(i.boundary)}`;

/* ------------------------------------------------------------- solving */

/**
 * Divide both sides by a coefficient. The symbol reverses exactly when the
 * coefficient is negative — the one rule Chapter 4 is built around.
 */
export function divideBy(i: Inequality, coefficient: Rational): Inequality {
  if (coefficient.n === 0) throw new Error("cannot divide an inequality by zero");
  const boundary = div0(i.boundary, coefficient);
  return { relation: toNumber(coefficient) < 0 ? flip(i.relation) : i.relation, boundary };
}

/** Add to both sides. The symbol never changes. */
export const shiftBy = (i: Inequality, amount: Rational): Inequality => ({
  relation: i.relation,
  boundary: rat(i.boundary.n * amount.d + amount.n * i.boundary.d, i.boundary.d * amount.d),
});

/* -------------------------------------------------------------- parsing */

const RELATION_FROM_TEXT: Record<string, Relation> = {
  "<": "lt", "<=": "le", "≤": "le", "=<": "le",
  ">": "gt", ">=": "ge", "≥": "ge", "=>": "ge",
};

/**
 * Parse "x >= 5", "x ≥ 5" or "5 <= x" into the variable-on-the-left form.
 * Reading a reversed statement is part of the skill, so both orders are accepted.
 */
export function parseInequality(raw: string, v = "x"): Inequality | null {
  // The game renders thousands with commas, and a learner types them too.
  const s = raw.trim().replace(/−/g, "-").replace(/,/g, "").replace(/\s+/g, "");
  const m = /^(.*?)(<=|>=|=<|=>|≤|≥|<|>)(.*)$/.exec(s);
  if (!m) return null;
  const relation = RELATION_FROM_TEXT[m[2]!];
  if (!relation) return null;

  const left = m[1]!;
  const right = m[3]!;
  const number = (text: string): Rational | null => {
    if (/^-?\d+$/.test(text)) return rat(Number(text));
    const frac = /^(-?\d+)\/(\d+)$/.exec(text);
    if (frac) return Number(frac[2]) === 0 ? null : rat(Number(frac[1]), Number(frac[2]));
    const dec = /^(-?)(\d*)\.(\d+)$/.exec(text);
    if (dec) {
      const digits = dec[3]!;
      const whole = dec[2] === "" ? 0 : Number(dec[2]);
      const value = rat(whole * 10 ** digits.length + Number(digits), 10 ** digits.length);
      return dec[1] === "-" ? rat(-value.n, value.d) : value;
    }
    return null;
  };

  if (left === v) {
    const b = number(right);
    return b === null ? null : { relation, boundary: b };
  }
  if (right === v) {
    // "5 < x" is "x > 5": reading it the other way round flips the symbol.
    const b = number(left);
    return b === null ? null : { relation: flip(relation), boundary: b };
  }
  return null;
}

/* --------------------------------------------------------------- phrases */

/** The four phrase families the registry names, and the symbol each maps to. */
export const PHRASES: { phrase: string; relation: Relation }[] = [
  { phrase: "at least", relation: "ge" },
  { phrase: "no less than", relation: "ge" },
  { phrase: "at most", relation: "le" },
  { phrase: "no more than", relation: "le" },
  { phrase: "more than", relation: "gt" },
  { phrase: "greater than", relation: "gt" },
  { phrase: "fewer than", relation: "lt" },
  { phrase: "less than", relation: "lt" },
];
