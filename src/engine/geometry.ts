// Chapter 9 and 10 geometry, in exact arithmetic.
//
// Two things here are not obvious.
//
// First, pi. The registry lets a card ask for either form: "use pi = 3.14" or
// "leave it in terms of pi". Rather than carry a tolerance, 3.14 is treated as
// the exact rational 157/50, so a decimal answer is exact arithmetic like every
// other answer in the engine. An exact-form answer carries the COEFFICIENT of
// pi as its Rational and writes itself as "25π"; those cards are always
// multiple-choice, because a keypad cannot type a Greek letter.
//
// Second, roots. Most lengths here come from Pythagorean triples and are whole.
// Where they are not, the card says "to the nearest tenth" and the answer is the
// rounded value — stated in the prompt, so the rounding is part of the question
// rather than a loss of precision behind the player's back.

import type { Rational } from "./rational";
import { rat, add, sub, mul, div0, cmp, fmtFraction, fmtDecimal, fmtInt, isTerminating } from "./rational";

/** The value the registry names for decimal-form circle work. */
export const PI_314 = rat(157, 50);

/** How a number is written when it is a plain quantity rather than a pi multiple. */
export const showNumber = (r: Rational): string =>
  (r.d === 1 ? fmtInt(r.n) : isTerminating(r) ? fmtDecimal(r) : fmtFraction(r));

/** "25π", "π", "1/2π". A coefficient of zero is just zero. */
export function piLabel(coefficient: Rational): string {
  if (coefficient.n === 0) return "0";
  if (coefficient.d === 1 && coefficient.n === 1) return "π";
  if (coefficient.d === 1 && coefficient.n === -1) return "−π";
  return `${showNumber(coefficient)}π`;
}

/**
 * Accepts the exact form a player can actually produce: the option text itself,
 * or the bare coefficient typed without the symbol. A decimal is NOT accepted
 * here — a card that wants a decimal asks for one and uses PI_314, so its answer
 * is an ordinary Rational and ordinary acceptance.
 */
export function acceptPi(coefficient: Rational): (input: unknown) => boolean {
  const exact = piLabel(coefficient).replace(/\s+/g, "");
  const bare = showNumber(coefficient);
  return (input: unknown): boolean => {
    // The card's own answer arrives as the Rational coefficient, not as text,
    // so the object form has to be recognised or the generator rejects itself.
    if (input !== null && typeof input === "object" && "n" in input && "d" in input) {
      const r = input as Rational;
      return r.n * coefficient.d === coefficient.n * r.d;
    }
    const s = String(input).replace(/\s+/g, "").replace(/pi/gi, "π");
    return s === exact || s === bare;
  };
}

/* ------------------------------------------------------------------ circles */

export const diameterOf = (radius: Rational): Rational => mul(radius, rat(2));
export const radiusOf = (diameter: Rational): Rational => div0(diameter, rat(2));

/** C = 2πr. Returns the COEFFICIENT of pi. */
export const circumferenceCoefficient = (radius: Rational): Rational => mul(radius, rat(2));

/** A = πr². Returns the COEFFICIENT of pi. */
export const circleAreaCoefficient = (radius: Rational): Rational => mul(radius, radius);

/** The same two, evaluated with a given value of pi. */
export const circumference = (radius: Rational, pi: Rational): Rational =>
  mul(circumferenceCoefficient(radius), pi);
export const circleArea = (radius: Rational, pi: Rational): Rational =>
  mul(circleAreaCoefficient(radius), pi);

/* ---------------------------------------------------------------- triangles */

/**
 * Three lengths make a triangle only when the two shorter ones add to MORE than
 * the longest. Equality is a straight line, not a triangle, which is the
 * registry's `equality-passes` error tag.
 */
export function isTriangle(a: number, b: number, c: number): boolean {
  const [x, y, z] = [a, b, c].sort((p, q) => p - q) as [number, number, number];
  return x > 0 && x + y > z;
}

/** The open range the third side must fall in, given two sides. */
export function thirdSideRange(a: number, b: number): { low: number; high: number } {
  return { low: Math.abs(a - b), high: a + b };
}

/** The registry's triple list, plus their multiples. */
export const TRIPLES: readonly [number, number, number][] = [
  [3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [7, 24, 25],
  [9, 12, 15], [9, 40, 41], [12, 16, 20], [10, 24, 26], [20, 21, 29],
];

export const isRightTriangle = (a: number, b: number, c: number): boolean => {
  const [x, y, z] = [a, b, c].sort((p, q) => p - q) as [number, number, number];
  return x * x + y * y === z * z;
};

/** Rounded to the nearest tenth, which is what the card asks for. */
export const toTenth = (value: number): Rational => rat(Math.round(value * 10), 10);

export const hypotenuse = (a: number, b: number): number => Math.sqrt(a * a + b * b);
export const otherLeg = (c: number, a: number): number => Math.sqrt(c * c - a * a);

/* -------------------------------------------------------------------- solids */

export interface Box { l: Rational; w: Rational; h: Rational }

/** S = 2(lw + lh + wh) for a rectangular prism. */
export const boxSurface = (b: Box): Rational =>
  mul(rat(2), add(add(mul(b.l, b.w), mul(b.l, b.h)), mul(b.w, b.h)));

export const boxVolume = (b: Box): Rational => mul(mul(b.l, b.w), b.h);

/** S = 2B + Ph for any prism, given its base area and perimeter. */
export const prismSurface = (baseArea: Rational, basePerimeter: Rational, height: Rational): Rational =>
  add(mul(rat(2), baseArea), mul(basePerimeter, height));

export const prismVolume = (baseArea: Rational, height: Rational): Rational => mul(baseArea, height);

/** S = 2πr² + 2πrh for a cylinder. Returns the COEFFICIENT of pi. */
export const cylinderSurfaceCoefficient = (radius: Rational, height: Rational): Rational =>
  add(mul(rat(2), mul(radius, radius)), mul(rat(2), mul(radius, height)));

/** The curved part alone: 2πrh. */
export const cylinderLateralCoefficient = (radius: Rational, height: Rational): Rational =>
  mul(rat(2), mul(radius, height));

/** V = πr²h for a cylinder. Returns the COEFFICIENT of pi. */
export const cylinderVolumeCoefficient = (radius: Rational, height: Rational): Rational =>
  mul(mul(radius, radius), height);

/** S = B + (1/2)Pl for a pyramid, with l the SLANT height. */
export const pyramidSurface = (baseArea: Rational, basePerimeter: Rational, slant: Rational): Rational =>
  add(baseArea, mul(rat(1, 2), mul(basePerimeter, slant)));

export const pyramidLateral = (basePerimeter: Rational, slant: Rational): Rational =>
  mul(rat(1, 2), mul(basePerimeter, slant));

/** V = (1/3)Bh for a pyramid or a cone. */
export const pyramidVolume = (baseArea: Rational, height: Rational): Rational =>
  mul(rat(1, 3), mul(baseArea, height));

/** V = (1/3)πr²h for a cone. Returns the COEFFICIENT of pi. */
export const coneVolumeCoefficient = (radius: Rational, height: Rational): Rational =>
  mul(rat(1, 3), mul(mul(radius, radius), height));

/** V = (4/3)πr³ for a sphere. Returns the COEFFICIENT of pi. */
export const sphereVolumeCoefficient = (radius: Rational): Rational =>
  mul(rat(4, 3), mul(mul(radius, radius), radius));

/* -------------------------------------------------------------------- angles */

export const complement = (angle: Rational): Rational => sub(rat(90), angle);
export const supplement = (angle: Rational): Rational => sub(rat(180), angle);

export type AnglePair =
  | "COMPLEMENTARY" | "SUPPLEMENTARY" | "VERTICAL" | "ADJACENT"
  | "CORRESPONDING" | "ALTERNATE INTERIOR" | "ALTERNATE EXTERIOR" | "SAME-SIDE INTERIOR";

/** Which pairs are equal and which add to 180, for a transversal figure. */
export const EQUAL_PAIRS: readonly AnglePair[] = [
  "VERTICAL", "CORRESPONDING", "ALTERNATE INTERIOR", "ALTERNATE EXTERIOR",
];
export const SUPPLEMENTARY_PAIRS: readonly AnglePair[] = ["SUPPLEMENTARY", "SAME-SIDE INTERIOR"];

export const partnerAngle = (angle: Rational, pair: AnglePair): Rational =>
  (EQUAL_PAIRS.includes(pair) ? angle : supplement(angle));

/* ------------------------------------------------------------------- slices */

export type Solid =
  | "RECTANGULAR PRISM" | "TRIANGULAR PRISM" | "CYLINDER" | "CUBE"
  | "SQUARE PYRAMID" | "TRIANGULAR PYRAMID" | "CONE";
export type SliceDirection = "PARALLEL TO THE BASE" | "PERPENDICULAR TO THE BASE";

/**
 * What a slice looks like. A slice parallel to the base is a copy of the base;
 * a slice perpendicular to the base of a prism or cylinder is a rectangle, and
 * of a pyramid or cone a triangle.
 */
export function crossSection(solid: Solid, direction: SliceDirection): string {
  const base: Record<Solid, string> = {
    "RECTANGULAR PRISM": "RECTANGLE",
    "TRIANGULAR PRISM": "TRIANGLE",
    "CYLINDER": "CIRCLE",
    "CUBE": "SQUARE",
    "SQUARE PYRAMID": "SQUARE",
    "TRIANGULAR PYRAMID": "TRIANGLE",
    "CONE": "CIRCLE",
  };
  if (direction === "PARALLEL TO THE BASE") return base[solid];
  // A cut straight down through the tip of anything that narrows to a point is
  // a triangle; through a prism or a cylinder it is a rectangle, and a cube's
  // is a square because all its edges are equal.
  if (solid === "SQUARE PYRAMID" || solid === "TRIANGULAR PYRAMID" || solid === "CONE") return "TRIANGLE";
  return solid === "CUBE" ? "SQUARE" : "RECTANGLE";
}

/** Sorted ascending, for a "which is bigger" comparison. */
export const bigger = (a: Rational, b: Rational): Rational => (cmp(a, b) >= 0 ? a : b);
