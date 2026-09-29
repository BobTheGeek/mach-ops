import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  qRational, qInteger, qSqrt, qPi, qScaledSqrt, isIrrational, isPerfectSquare, sortQuantities,
  repeatingToFraction, trickPowers, toSci, fromSci, fmtSci, superscript, sciEqual,
} from "../../src/engine/quantity";
import { rat, eq, decimalParts, toNumber } from "../../src/engine/rational";

describe("quantities", () => {
  it("knows a perfect square from one that is not", () => {
    for (const n of [0, 1, 4, 9, 16, 49, 144]) expect(isPerfectSquare(n), String(n)).toBe(true);
    for (const n of [2, 3, 10, 40, 50, 150]) expect(isPerfectSquare(n), String(n)).toBe(false);
    expect(isPerfectSquare(-4)).toBe(false);
  });

  it("marks a root rational only when the radicand is a perfect square", () => {
    expect(isIrrational(qSqrt(49))).toBe(false);
    expect(qSqrt(49).rational).toEqual(rat(7));
    expect(isIrrational(qSqrt(50))).toBe(true);
    expect(qSqrt(50).rational).toBeNull();
  });

  it("marks pi irrational and a fraction rational", () => {
    expect(isIrrational(qPi())).toBe(true);
    expect(isIrrational(qPi(3))).toBe(true);
    expect(isIrrational(qRational(rat(22, 7)))).toBe(false);
    expect(isIrrational(qInteger(-4))).toBe(false);
  });

  it("writes each quantity the way the card should show it", () => {
    expect(qSqrt(40).label).toBe("√40");
    expect(qPi().label).toBe("π");
    expect(qPi(2).label).toBe("2π");
    expect(qScaledSqrt(2, 10, 1).label).toBe("2√10 + 1");
    expect(qScaledSqrt(1, 10, 0).label).toBe("√10");
  });

  it("values a scaled root correctly", () => {
    expect(qScaledSqrt(2, 10, 1).value).toBeCloseTo(2 * Math.sqrt(10) + 1, 10);
    expect(qScaledSqrt(3, 16, -2).rational).toEqual(rat(10)); // 3*4 - 2
  });

  it("sorts by worth, not by how it is written", () => {
    const sorted = sortQuantities([qPi(), qSqrt(4), qRational(rat(7, 2)), qSqrt(10)]);
    expect(sorted.map((q) => q.label)).toEqual(["√4", "π", "√10", "3 1/2"]);
  });
});

describe("repeating decimal to fraction", () => {
  it("does the x, 10x, subtract trick exactly", () => {
    expect(repeatingToFraction("0", "", "3")).toEqual(rat(1, 3));
    expect(repeatingToFraction("0", "", "45")).toEqual(rat(5, 11));
    expect(repeatingToFraction("0", "1", "6")).toEqual(rat(1, 6));
    expect(repeatingToFraction("2", "", "7")).toEqual(rat(25, 9));
  });

  it("names the two powers of ten the trick multiplies by", () => {
    expect(trickPowers("", "3")).toEqual({ high: 10, low: 1 });
    expect(trickPowers("", "45")).toEqual({ high: 100, low: 1 });
    expect(trickPowers("1", "6")).toEqual({ high: 100, low: 10 });
  });

  it("round-trips against the long division that produced it", () => {
    for (const d of [3, 6, 7, 9, 11, 12, 13, 33, 99]) {
      for (let n = 1; n < d; n++) {
        const value = rat(n, d);
        const p = decimalParts(value);
        if (!p.repeat || p.fixed.length + p.repeat.length > 12) continue;
        expect(repeatingToFraction(p.whole, p.fixed, p.repeat), `${n}/${d}`).toEqual(value);
      }
    }
  });
});

describe("scientific notation", () => {
  it("normalises the coefficient into [1, 10)", () => {
    fc.assert(fc.property(fc.double({ min: -1e9, max: 1e9, noNaN: true }), (x) => {
      if (x === 0) return true;
      const s = toSci(x);
      return Math.abs(s.coefficient) >= 1 && Math.abs(s.coefficient) < 10;
    }));
  });

  it("round-trips a value that survives rounding to two decimals", () => {
    for (const x of [4_200_000, 0.00042, -7.5e8, 1, 3.14e-6]) {
      const back = fromSci(toSci(x));
      expect(Math.abs(back - x) / Math.abs(x), String(x)).toBeLessThan(1e-9);
    }
  });

  it("rounds the coefficient to two decimals, carrying when it reaches ten", () => {
    // 999,900 is 9.999 x 10^5; at two decimals that is 10.00, which is out of
    // range, so it carries to 1.00 x 10^6. The registry asks for two decimals.
    expect(toSci(999_900)).toEqual({ coefficient: 1, exponent: 6 });
  });

  it("survives a denormal rather than returning Infinity", () => {
    const s = toSci(5e-324);
    expect(Number.isFinite(s.coefficient)).toBe(true);
    expect(Math.abs(s.coefficient)).toBeGreaterThanOrEqual(1);
    expect(Math.abs(s.coefficient)).toBeLessThan(10);
  });

  it("treats zero as zero", () => {
    expect(toSci(0)).toEqual({ coefficient: 0, exponent: 0 });
  });

  it("writes exponents as superscripts, minus included", () => {
    expect(superscript(6)).toBe("⁶");
    expect(superscript(12)).toBe("¹²");
    expect(superscript(-3)).toBe("⁻³");
    expect(fmtSci({ coefficient: 4, exponent: 6 })).toBe("4 × 10⁶");
  });

  it("compares by value, not by how it is written", () => {
    expect(sciEqual({ coefficient: 4, exponent: 6 }, { coefficient: 4, exponent: 6 })).toBe(true);
    expect(sciEqual({ coefficient: 4, exponent: 6 }, { coefficient: 4, exponent: 5 })).toBe(false);
  });

  it("agrees with the rational module on exact decimals", () => {
    expect(toNumber(rat(1, 4))).toBe(0.25);
    expect(eq(rat(1, 4), rat(25, 100))).toBe(true);
  });
});
