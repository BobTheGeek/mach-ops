import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  ineq, flip, GLYPH, isStrict, isClosed, shadesRight, satisfies, eqInequality,
  fmtInequality, divideBy, shiftBy, parseInequality, PHRASES, type Relation,
} from "../../src/engine/inequality";
import { rat, div0 } from "../../src/engine/rational";

const R = (n: number, d = 1) => rat(n, d);
const ALL: Relation[] = ["lt", "le", "gt", "ge"];

describe("symbols", () => {
  it("uses the glyphs the design doc asks for, never <=", () => {
    expect(GLYPH).toEqual({ lt: "<", le: "≤", gt: ">", ge: "≥" });
    for (const r of ALL) expect(GLYPH[r]).not.toContain("=");
  });

  it("flips to the opposite direction and back", () => {
    expect(flip("lt")).toBe("gt");
    expect(flip("ge")).toBe("le");
    for (const r of ALL) expect(flip(flip(r))).toBe(r);
  });

  it("keeps strictness through a flip", () => {
    for (const r of ALL) expect(isStrict(flip(r))).toBe(isStrict(r));
  });

  it("pairs an open circle with a strict symbol", () => {
    expect(isClosed("le")).toBe(true);
    expect(isClosed("lt")).toBe(false);
    for (const r of ALL) expect(isClosed(r)).toBe(!isStrict(r));
  });

  it("shades right for greater-than", () => {
    expect(shadesRight("gt")).toBe(true);
    expect(shadesRight("ge")).toBe(true);
    expect(shadesRight("lt")).toBe(false);
  });
});

describe("satisfies", () => {
  it("includes the boundary only when the symbol does", () => {
    expect(satisfies(ineq("ge", R(5)), R(5))).toBe(true);
    expect(satisfies(ineq("gt", R(5)), R(5))).toBe(false);
    expect(satisfies(ineq("le", R(5)), R(5))).toBe(true);
    expect(satisfies(ineq("lt", R(5)), R(5))).toBe(false);
  });

  it("agrees with ordinary comparison away from the boundary", () => {
    fc.assert(fc.property(fc.integer({ min: -30, max: 30 }), fc.integer({ min: -30, max: 30 }), (b, x) => {
      if (b === x) return true;
      return satisfies(ineq("gt", R(b)), R(x)) === x > b
        && satisfies(ineq("lt", R(b)), R(x)) === x < b;
    }));
  });
});

describe("solving", () => {
  it("does not flip when dividing by a positive", () => {
    expect(divideBy(ineq("gt", R(12)), R(3))).toEqual(ineq("gt", R(4)));
  });

  it("flips when dividing by a negative", () => {
    expect(divideBy(ineq("gt", R(12)), R(-3))).toEqual(ineq("lt", R(-4)));
    expect(divideBy(ineq("le", R(-20)), R(-4))).toEqual(ineq("ge", R(5)));
  });

  it("does not flip for a negative boundary alone", () => {
    // The registry's flip-on-negative-constant mistake: b is negative, a is not.
    expect(divideBy(ineq("gt", R(-12)), R(3)).relation).toBe("gt");
  });

  it("refuses to divide by zero", () => {
    expect(() => divideBy(ineq("gt", R(1)), R(0))).toThrow();
  });

  it("never flips for adding or subtracting", () => {
    for (const r of ALL) {
      expect(shiftBy(ineq(r, R(5)), R(-3)).relation).toBe(r);
      expect(shiftBy(ineq(r, R(5)), R(3))).toEqual(ineq(r, R(8)));
    }
  });

  it("keeps the same solutions after dividing by a negative", () => {
    // 3 and 10 straddle the boundary of -2x > -12, i.e. x < 6.
    const solved = divideBy(ineq("gt", R(-12)), R(-2));
    expect(solved).toEqual(ineq("lt", R(6)));
    expect(satisfies(solved, R(3))).toBe(true);
    expect(satisfies(solved, R(10))).toBe(false);
  });
});

describe("formatting and parsing", () => {
  it("writes the variable on the left", () => {
    expect(fmtInequality(ineq("ge", R(5)))).toBe("x ≥ 5");
    expect(fmtInequality(ineq("lt", R(-3)))).toBe("x < −3");
  });

  it("reads back what it wrote", () => {
    for (const r of ALL) {
      for (const b of [-15, -1, 0, 7, 15]) {
        const original = ineq(r, R(b));
        const parsed = parseInequality(fmtInequality(original));
        expect(parsed, `${r} ${b}`).not.toBeNull();
        expect(eqInequality(parsed!, original), `${r} ${b}`).toBe(true);
      }
    }
  });

  it("accepts the typed forms as well as the glyphs", () => {
    expect(parseInequality("x>=5")).toEqual(ineq("ge", R(5)));
    expect(parseInequality("x ≥ 5")).toEqual(ineq("ge", R(5)));
    expect(parseInequality("x <= -2")).toEqual(ineq("le", R(-2)));
    expect(parseInequality("x < 1/2")).toEqual(ineq("lt", R(1, 2)));
    expect(parseInequality("x > 2.5")).toEqual(ineq("gt", R(5, 2)));
  });

  it("flips a statement written the other way round", () => {
    // "5 < x" says the same thing as "x > 5".
    expect(parseInequality("5<x")).toEqual(ineq("gt", R(5)));
    expect(parseInequality("-3 ≥ x")).toEqual(ineq("le", R(-3)));
  });

  it("rejects junk rather than guessing", () => {
    for (const s of ["", "x = 5", "x 5", "y > 5", "x >", "> 5", "x > abc"]) {
      expect(parseInequality(s), s).toBeNull();
    }
  });
});

describe("phrases", () => {
  it("maps each phrase family to the symbol the registry names", () => {
    const of = (p: string): Relation => PHRASES.find((x) => x.phrase === p)!.relation;
    expect(of("at least")).toBe("ge");
    expect(of("at most")).toBe("le");
    expect(of("more than")).toBe("gt");
    expect(of("fewer than")).toBe("lt");
  });

  it("covers all four symbols", () => {
    expect(new Set(PHRASES.map((p) => p.relation)).size).toBe(4);
  });
});

describe("exact division", () => {
  it("divides without floating point drift", () => {
    expect(div0(R(1), R(3))).toEqual(R(1, 3));
    expect(div0(R(-20), R(-4))).toEqual(R(5));
    expect(() => div0(R(1), R(0))).toThrow();
  });
});

describe("fractional boundaries round-trip", () => {
  it("writes an improper fraction, because a mixed number cannot be read back", () => {
    // "x ≥ 2 1/4" loses its space in an input box and reads as 21/4.
    expect(fmtInequality(ineq("ge", R(9, 4)))).toBe("x ≥ 9/4");
    expect(fmtInequality(ineq("lt", R(-9, 4)))).toBe("x < −9/4");
  });

  it("reads back every fractional boundary it writes", () => {
    for (const r of ALL) {
      for (const [n, d] of [[9, 4], [-9, 4], [1, 2], [-33, 10], [7, 1]] as const) {
        const original = ineq(r, R(n, d));
        const parsed = parseInequality(fmtInequality(original));
        expect(parsed, `${r} ${n}/${d}`).not.toBeNull();
        expect(eqInequality(parsed!, original), `${r} ${n}/${d}`).toBe(true);
      }
    }
  });
});

describe("thousands separators", () => {
  it("reads a boundary the game rendered with commas", () => {
    // fmtInt groups thousands, so the generator's own answer arrives comma'd.
    expect(parseInequality("x > 2,168")).toEqual(ineq("gt", R(2168)));
    expect(parseInequality("x ≤ −12,500")).toEqual(ineq("le", R(-12500)));
  });
});
