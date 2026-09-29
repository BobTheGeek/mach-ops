// Exact rational arithmetic. Chapter 1 mixes fractions and decimals, and the
// spec requires 3/4, 0.75 and 75% to all be accepted for the same answer, so
// answers are carried as exact rationals and only formatted at the edges.

export interface Rational {
  /** numerator; carries the sign */
  n: number;
  /** denominator; always > 0 */
  d: number;
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = b; b = a % b; a = t; }
  return a || 1;
}

export function rat(n: number, d = 1): Rational {
  if (d === 0) throw new Error("rational with zero denominator");
  if (!Number.isInteger(n) || !Number.isInteger(d)) throw new Error(`rat() needs integers, got ${n}/${d}`);
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

/** Exact conversion of a finite decimal, e.g. -2.25 -> -9/4. */
export function fromDecimal(x: number, places: number): Rational {
  const scale = 10 ** places;
  return rat(Math.round(x * scale), scale);
}

export const add = (a: Rational, b: Rational): Rational => rat(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Rational, b: Rational): Rational => rat(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Rational, b: Rational): Rational => rat(a.n * b.n, a.d * b.d);
export const neg = (a: Rational): Rational => ({ n: -a.n, d: a.d });
/** Exact division. Named div0 because dividing by zero throws rather than returning Infinity. */
export function div0(a: Rational, b: Rational): Rational {
  if (b.n === 0) throw new Error("division by zero");
  return rat(a.n * b.d, a.d * b.n);
}
export const abs = (a: Rational): Rational => ({ n: Math.abs(a.n), d: a.d });
export const toNumber = (a: Rational): number => a.n / a.d;
export const eq = (a: Rational, b: Rational): boolean => a.n * b.d === b.n * a.d;
export const cmp = (a: Rational, b: Rational): number => Math.sign(a.n * b.d - b.n * a.d);
export const isInteger = (a: Rational): boolean => a.d === 1;

export function isRational(x: unknown): x is Rational {
  return typeof x === "object" && x !== null && typeof (x as Rational).n === "number" && typeof (x as Rational).d === "number";
}

/** True when the value terminates in base 10, i.e. the denominator is only 2s and 5s. */
export function isTerminating(a: Rational): boolean {
  let d = a.d;
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d === 1;
}

/** Decimal places needed to write a terminating rational exactly, else -1. */
export function decimalPlaces(a: Rational): number {
  if (!isTerminating(a)) return -1;
  let d = a.d, twos = 0, fives = 0;
  while (d % 2 === 0) { d /= 2; twos++; }
  while (d % 5 === 0) { d /= 5; fives++; }
  return Math.max(twos, fives);
}

/* ------------------------------------------------------------ formatting */

/** U+2212 minus, per the design doc math text style. Never a hyphen. */
export const MINUS = "−";

export function fmtInt(n: number): string {
  return (n < 0 ? MINUS : "") + Math.abs(n).toLocaleString("en-US");
}

/** Decimal form when it terminates, otherwise the fraction form. */
export function fmtDecimal(a: Rational): string {
  const places = decimalPlaces(a);
  if (places < 0) return fmtFraction(a);
  const v = toNumber(a);
  return (v < 0 ? MINUS : "") + Math.abs(v).toFixed(places);
}

/** Mixed-number form for |value| > 1, e.g. -2 1/4. Inline slash: table cells and logs. */
export function fmtFraction(a: Rational): string {
  if (a.d === 1) return fmtInt(a.n);
  const sign = a.n < 0 ? MINUS : "";
  const n = Math.abs(a.n);
  const whole = Math.floor(n / a.d);
  const rem = n % a.d;
  if (whole === 0) return `${sign}${rem}/${a.d}`;
  return `${sign}${whole} ${rem}/${a.d}`;
}

/** Improper form, e.g. -9/4. Used in worked steps where the mixed form hides the method. */
export function fmtImproper(a: Rational): string {
  if (a.d === 1) return fmtInt(a.n);
  return `${a.n < 0 ? MINUS : ""}${Math.abs(a.n)}/${a.d}`;
}

/**
 * Parse learner input. Accepts "3/4", "-3/4", "1 1/2", "0.75", "75%", "-3,500",
 * and the U+2212 minus the game itself renders.
 */
export function parseRational(raw: string): Rational | null {
  let s = raw.trim().replace(/−/g, "-").replace(/,/g, "").replace(/\s+/g, " ");
  if (s === "") return null;

  let percent = false;
  if (s.endsWith("%")) { percent = true; s = s.slice(0, -1).trim(); }

  let out: Rational | null = null;
  let m: RegExpMatchArray | null;

  if ((m = s.match(/^(-?)(\d+)\s+(\d+)\/(\d+)$/))) {
    // mixed number: the sign applies to the whole quantity
    const whole = Number(m[2]), n = Number(m[3]), d = Number(m[4]);
    if (d === 0) return null;
    const mag = rat(whole * d + n, d);
    out = m[1] === "-" ? neg(mag) : mag;
  } else if ((m = s.match(/^(-?\d+)\/(-?\d+)$/))) {
    const d = Number(m[2]);
    if (d === 0) return null;
    out = rat(Number(m[1]), d);
  } else if ((m = s.match(/^(-?)(\d*)\.(\d+)$/))) {
    const int = m[2] === "" ? 0 : Number(m[2]);
    const frac = m[3]!;
    const mag = add(rat(int), rat(Number(frac), 10 ** frac.length));
    out = m[1] === "-" ? neg(mag) : mag;
  } else if ((m = s.match(/^-?\d+$/))) {
    out = rat(Number(s));
  }

  if (out === null) return null;
  return percent ? mul(out, rat(1, 100)) : out;
}

/* -------------------------------------------------- repeating decimals */

export interface DecimalParts {
  negative: boolean;
  /** digits before the point */
  whole: string;
  /** digits after the point that do not repeat */
  fixed: string;
  /** the repetend; empty when the decimal terminates */
  repeat: string;
}

/**
 * Long division with remainder tracking: when a remainder comes back, the digits
 * since its first appearance are the repetend. ns.2.3 is exactly this method, so
 * the generator and the manual page describe the same steps.
 */
export function decimalParts(a: Rational): DecimalParts {
  const negative = a.n < 0;
  let n = Math.abs(a.n);
  const d = a.d;

  const whole = String(Math.floor(n / d));
  let rem = n % d;

  const digits: string[] = [];
  const seen = new Map<number, number>();
  let repeatAt = -1;

  while (rem !== 0) {
    const prior = seen.get(rem);
    if (prior !== undefined) { repeatAt = prior; break; }
    seen.set(rem, digits.length);
    n = rem * 10;
    digits.push(String(Math.floor(n / d)));
    rem = n % d;
  }

  if (repeatAt < 0) return { negative, whole, fixed: digits.join(""), repeat: "" };
  return {
    negative,
    whole,
    fixed: digits.slice(0, repeatAt).join(""),
    repeat: digits.slice(repeatAt).join(""),
  };
}

/** U+0305 combining overline: the vinculum over a repeating block. */
export const OVERLINE = "̅";

export function overline(digits: string): string {
  return digits.split("").map((d) => d + OVERLINE).join("");
}

/** Exact decimal form, with a bar over the repetend when there is one. */
export function fmtRepeating(a: Rational): string {
  const p = decimalParts(a);
  const sign = p.negative ? MINUS : "";
  if (!p.fixed && !p.repeat) return `${sign}${p.whole}`;
  return `${sign}${p.whole}.${p.fixed}${p.repeat ? overline(p.repeat) : ""}`;
}

export const isRepeating = (a: Rational): boolean => decimalParts(a).repeat.length > 0;
