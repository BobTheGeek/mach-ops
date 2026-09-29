import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  lin, constant, addLinear, subLinear, scaleLinear, negLinear, eqLinear, evaluate,
  fmtLinear, fmtBracketed, fmtSum, parseLinear, fmtFactored, parseFactored, expand,
  gcfOf, factor, isFullyFactored,
} from "../../src/engine/linear";
import { rat, eq, MINUS } from "../../src/engine/rational";

const R = (n: number, d = 1) => rat(n, d);

describe("arithmetic", () => {
  it("adds and subtracts term by term", () => {
    expect(addLinear(lin(R(3), R(2)), lin(R(4), R(-7)))).toEqual(lin(R(7), R(-5)));
    expect(subLinear(lin(R(5), R(3)), lin(R(2), R(-4)))).toEqual(lin(R(3), R(7)));
  });

  it("scales and negates every term", () => {
    expect(scaleLinear(R(-3), lin(R(1), R(-4)))).toEqual(lin(R(-3), R(12)));
    expect(negLinear(lin(R(2), R(-4)))).toEqual(lin(R(-2), R(4)));
  });

  it("evaluates at a value", () => {
    expect(evaluate(lin(R(3), R(2)), R(4))).toEqual(R(14));
    expect(evaluate(lin(R(1, 2), R(3)), R(4))).toEqual(R(5));
  });
});

describe("formatting", () => {
  it("writes a bare coefficient of one as just the variable", () => {
    expect(fmtLinear(lin(R(1), R(0)))).toBe("x");
    expect(fmtLinear(lin(R(-1), R(0)))).toBe(`${MINUS}x`);
    expect(fmtLinear(lin(R(1), R(4)))).toBe("x + 4");
  });

  it("drops a zero term rather than writing + 0", () => {
    expect(fmtLinear(lin(R(3), R(0)))).toBe("3x");
    expect(fmtLinear(lin(R(0), R(7)))).toBe("7");
    expect(fmtLinear(lin(R(0), R(0)))).toBe("0");
  });

  it("writes a negative constant with a minus, not a plus-minus", () => {
    expect(fmtLinear(lin(R(2), R(-5)))).toBe(`2x ${MINUS} 5`);
    expect(fmtLinear(lin(R(-2), R(-5)))).toBe(`${MINUS}2x ${MINUS} 5`);
  });

  it("keeps fractional coefficients as fractions", () => {
    expect(fmtLinear(lin(R(1, 2), R(3)))).toBe("1/2x + 3");
  });

  it("brackets a subtrahend", () => {
    expect(fmtBracketed(lin(R(2), R(-4)))).toBe(`(2x ${MINUS} 4)`);
  });
});

describe("parsing", () => {
  it("reads the forms a learner types", () => {
    expect(parseLinear("3x+2")).toEqual(lin(R(3), R(2)));
    expect(parseLinear("3x + 2")).toEqual(lin(R(3), R(2)));
    expect(parseLinear("2 + 3x")).toEqual(lin(R(3), R(2)));
    expect(parseLinear("x")).toEqual(lin(R(1), R(0)));
    expect(parseLinear("-x+4")).toEqual(lin(R(-1), R(4)));
    expect(parseLinear("5")).toEqual(constant(R(5)));
    expect(parseLinear("1/2x - 3")).toEqual(lin(R(1, 2), R(-3)));
    expect(parseLinear("0.5x+3")).toEqual(lin(R(1, 2), R(3)));
  });

  it("accepts the game's own minus sign", () => {
    expect(parseLinear(`${MINUS}2x ${MINUS} 5`)).toEqual(lin(R(-2), R(-5)));
  });

  it("combines repeated terms, so 2x + 3x is 5x", () => {
    expect(parseLinear("2x+3x")).toEqual(lin(R(5), R(0)));
    expect(parseLinear("4x-7+2x")).toEqual(lin(R(6), R(-7)));
  });

  it("rejects junk rather than guessing", () => {
    for (const s of ["", "abc", "3y+2", "x3", "3x+", "+", "3//4x", "xx"]) {
      expect(parseLinear(s), s).toBeNull();
    }
  });

  it("round-trips its own formatting", () => {
    const anyLinear = fc.tuple(
      fc.integer({ min: -20, max: 20 }), fc.integer({ min: 1, max: 9 }),
      fc.integer({ min: -30, max: 30 }), fc.integer({ min: 1, max: 9 }),
    ).map(([an, ad, bn, bd]) => lin(rat(an, ad), rat(bn, bd)));

    fc.assert(fc.property(anyLinear, (p) => {
      const back = parseLinear(fmtLinear(p));
      return back !== null && eqLinear(back, p);
    }));
  });

  it("treats a reordered expression as the same answer", () => {
    fc.assert(fc.property(fc.integer({ min: -9, max: 9 }), fc.integer({ min: -20, max: 20 }), (a, b) => {
      if (a === 0 || b === 0) return true;
      // Written the way a person writes it: the sign goes between the terms,
      // never doubled up as "1+-1x".
      const sign = (n: number): string => (n < 0 ? "-" : "+");
      const forward = parseLinear(`${a}x${sign(b)}${Math.abs(b)}`);
      const reversed = parseLinear(`${b}${sign(a)}${Math.abs(a)}x`);
      return forward !== null && reversed !== null && eqLinear(forward, reversed);
    }));
  });

  it("rejects a doubled sign rather than guessing what was meant", () => {
    for (const s of ["1+-1x", "3x+-2", "2--3"]) expect(parseLinear(s), s).toBeNull();
  });
});

describe("factoring", () => {
  it("finds the greatest common factor of two integer terms", () => {
    expect(gcfOf(lin(R(6), R(12)))).toEqual(R(6));
    expect(gcfOf(lin(R(4), R(-10)))).toEqual(R(2));
    expect(gcfOf(lin(R(3), R(7)))).toEqual(R(1));
  });

  it("finds a fractional common factor", () => {
    expect(gcfOf(lin(R(1, 2), R(3, 2)))).toEqual(R(1, 2));
  });

  it("keeps the sign of the leading term on the factor", () => {
    expect(factor(lin(R(-6), R(12)))).toEqual({ g: R(-6), inner: lin(R(1), R(-2)) });
  });

  it("always expands back to what it factored", () => {
    fc.assert(fc.property(
      fc.integer({ min: -30, max: 30 }), fc.integer({ min: -40, max: 40 }),
      (a, b) => {
        if (a === 0 && b === 0) return true;
        const p = lin(R(a), R(b));
        return eqLinear(expand(factor(p)), p);
      },
    ));
  });

  it("reads a factored form back", () => {
    expect(parseFactored("6(x + 2)")).toEqual({ g: R(6), inner: lin(R(1), R(2)) });
    expect(parseFactored("-3(2x - 5)")).toEqual({ g: R(-3), inner: lin(R(2), R(-5)) });
    expect(parseFactored("1/2(x + 3)")).toEqual({ g: R(1, 2), inner: lin(R(1), R(3)) });
    expect(fmtFactored({ g: R(6), inner: lin(R(1), R(2)) })).toBe("6(x + 2)");
  });

  it("rejects a factored form that is not one", () => {
    for (const s of ["6x + 12", "6(", "(x+2)6", "0(x+2)", ""]) {
      expect(parseFactored(s), s).toBeNull();
    }
  });

  it("accepts only the fully factored answer", () => {
    const target = lin(R(6), R(12));
    expect(isFullyFactored({ g: R(6), inner: lin(R(1), R(2)) }, target)).toBe(true);
    // 2(3x + 6) expands correctly but 2 is not the greatest common factor.
    expect(isFullyFactored({ g: R(2), inner: lin(R(3), R(6)) }, target)).toBe(false);
    // 6(x + 3) does not expand to the target at all.
    expect(isFullyFactored({ g: R(6), inner: lin(R(1), R(3)) }, target)).toBe(false);
  });

  it("accepts the negative factoring of a negative-leading expression", () => {
    const target = lin(R(-6), R(12));
    expect(isFullyFactored({ g: R(-6), inner: lin(R(1), R(-2)) }, target)).toBe(true);
    expect(isFullyFactored({ g: R(6), inner: lin(R(-1), R(2)) }, target)).toBe(true);
  });
});

describe("constant helper", () => {
  it("builds an expression with no variable", () => {
    expect(constant(R(5))).toEqual(lin(R(0), R(5)));
    expect(eq(evaluate(constant(R(5)), R(99)), R(5))).toBe(true);
  });
});

describe("fmtSum", () => {
  it("writes a negative term after a minus, never after a plus", () => {
    const parts = [lin(R(-9), R(-19)), lin(R(-7), R(-20)), lin(R(1), R(7))];
    const text = fmtSum(parts);
    expect(text).not.toContain(`+ ${MINUS}`);
    expect(text).toBe(`${MINUS}9x ${MINUS} 19 ${MINUS} 7x ${MINUS} 20 + x + 7`);
  });

  it("reads back as the sum of its parts", () => {
    const parts = [lin(R(3), R(2)), lin(R(-4), R(5))];
    const parsed = parseLinear(fmtSum(parts))!;
    expect(parsed).toEqual(lin(R(-1), R(7)));
  });

  it("handles a single part and an empty list", () => {
    expect(fmtSum([lin(R(2), R(3))])).toBe("2x + 3");
    expect(fmtSum([])).toBe("");
  });
});

describe("thousands separators", () => {
  it("reads an expression the game rendered with commas", () => {
    expect(parseLinear("3x + 1,200")).toEqual(lin(R(3), R(1200)));
    expect(parseFactored("1,000(x + 2)")).toEqual({ g: R(1000), inner: lin(R(1), R(2)) });
  });
});
