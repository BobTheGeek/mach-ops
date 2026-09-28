import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  rat, fromDecimal, add, sub, mul, neg, abs, toNumber, eq, cmp, isInteger, isRational,
  isTerminating, decimalPlaces, parseRational, fmtInt, fmtFraction, fmtDecimal, fmtImproper, MINUS,
  decimalParts, fmtRepeating, isRepeating, OVERLINE,
} from "../../src/engine/rational";

describe("construction", () => {
  it("always normalises to lowest terms with a positive denominator", () => {
    expect(rat(6, 8)).toEqual({ n: 3, d: 4 });
    expect(rat(3, -4)).toEqual({ n: -3, d: 4 });
    expect(rat(-6, -8)).toEqual({ n: 3, d: 4 });
    expect(rat(0, 5)).toEqual({ n: 0, d: 1 });
  });

  it("rejects a zero denominator and non-integers", () => {
    expect(() => rat(1, 0)).toThrow();
    expect(() => rat(1.5, 2)).toThrow();
  });

  it("converts finite decimals exactly", () => {
    expect(fromDecimal(-2.25, 2)).toEqual({ n: -9, d: 4 });
    expect(fromDecimal(0.1, 1)).toEqual({ n: 1, d: 10 });
  });

  it("adds decimals without floating-point drift", () => {
    // 0.1 + 0.2 !== 0.3 in binary floating point; as rationals it is exact.
    expect(eq(add(fromDecimal(0.1, 1), fromDecimal(0.2, 1)), fromDecimal(0.3, 1))).toBe(true);
  });
});

describe("arithmetic", () => {
  const anyRat = fc.tuple(fc.integer({ min: -200, max: 200 }), fc.integer({ min: 1, max: 60 })).map(([n, d]) => rat(n, d));

  it("addition is commutative", () => {
    fc.assert(fc.property(anyRat, anyRat, (a, b) => eq(add(a, b), add(b, a))));
  });

  it("subtracting is adding the opposite", () => {
    fc.assert(fc.property(anyRat, anyRat, (a, b) => eq(sub(a, b), add(a, neg(b)))));
  });

  it("agrees with floating point within tolerance", () => {
    fc.assert(fc.property(anyRat, anyRat, (a, b) =>
      Math.abs(toNumber(add(a, b)) - (toNumber(a) + toNumber(b))) < 1e-9));
  });

  it("abs is never negative and cmp orders the same way as numbers", () => {
    fc.assert(fc.property(anyRat, anyRat, (a, b) => {
      if (toNumber(abs(a)) < 0) return false;
      return cmp(a, b) === Math.sign(toNumber(a) - toNumber(b));
    }));
  });

  it("multiplies", () => {
    expect(mul(rat(3, 4), rat(2, 3))).toEqual({ n: 1, d: 2 });
  });

  it("recognises integers and rationals", () => {
    expect(isInteger(rat(4, 2))).toBe(true);
    expect(isInteger(rat(3, 4))).toBe(false);
    expect(isRational(rat(1, 2))).toBe(true);
    expect(isRational(5)).toBe(false);
  });
});

describe("decimal form", () => {
  it("knows which values terminate", () => {
    expect(isTerminating(rat(1, 4))).toBe(true);
    expect(isTerminating(rat(1, 3))).toBe(false);
    expect(decimalPlaces(rat(1, 8))).toBe(3);
    expect(decimalPlaces(rat(1, 3))).toBe(-1);
  });
});

describe("formatting", () => {
  it("uses the U+2212 minus, never a hyphen", () => {
    expect(fmtInt(-5)).toBe(`${MINUS}5`);
    expect(fmtInt(-5).includes("-")).toBe(false);
    expect(fmtFraction(rat(-3, 4))).toBe(`${MINUS}3/4`);
  });

  it("groups thousands", () => {
    expect(fmtInt(-3500)).toBe(`${MINUS}3,500`);
  });

  it("writes mixed numbers and improper fractions", () => {
    expect(fmtFraction(rat(9, 4))).toBe("2 1/4");
    expect(fmtFraction(rat(-9, 4))).toBe(`${MINUS}2 1/4`);
    expect(fmtImproper(rat(-9, 4))).toBe(`${MINUS}9/4`);
  });

  it("writes decimals to the places they actually need", () => {
    expect(fmtDecimal(rat(-9, 4))).toBe(`${MINUS}2.25`);
    expect(fmtDecimal(rat(1, 2))).toBe("0.5");
  });
});

describe("parsing learner input", () => {
  it("accepts every written form of the same value", () => {
    for (const s of ["3/4", "0.75", "75%", ".75", "6/8"]) {
      expect(eq(parseRational(s)!, rat(3, 4)), s).toBe(true);
    }
  });

  it("accepts mixed numbers with the sign on the whole quantity", () => {
    expect(parseRational("-2 1/4")).toEqual(rat(-9, 4));
    expect(parseRational("2 1/4")).toEqual(rat(9, 4));
  });

  it("accepts the game's own minus sign and thousands separators", () => {
    expect(parseRational(`${MINUS}3,500`)).toEqual(rat(-3500));
    expect(parseRational("-3500")).toEqual(rat(-3500));
  });

  it("returns null on junk", () => {
    for (const s of ["", "abc", "1/0", "3//4", "--5"]) expect(parseRational(s), s).toBeNull();
  });

  it("round-trips its own formatting", () => {
    const anyRat = fc.tuple(fc.integer({ min: -200, max: 200 }), fc.integer({ min: 1, max: 60 })).map(([n, d]) => rat(n, d));
    fc.assert(fc.property(anyRat, (a) => {
      const parsed = parseRational(fmtFraction(a));
      return parsed !== null && eq(parsed, a);
    }));
  });
});

describe("repeating decimals", () => {
  it("splits a terminating value into whole and fixed digits", () => {
    expect(decimalParts(rat(1, 4))).toEqual({ negative: false, whole: "0", fixed: "25", repeat: "" });
    expect(decimalParts(rat(-9, 4))).toEqual({ negative: true, whole: "2", fixed: "25", repeat: "" });
    expect(decimalParts(rat(3))).toEqual({ negative: false, whole: "3", fixed: "", repeat: "" });
  });

  it("finds the repetend by long division", () => {
    expect(decimalParts(rat(1, 3))).toMatchObject({ whole: "0", fixed: "", repeat: "3" });
    expect(decimalParts(rat(1, 6))).toMatchObject({ whole: "0", fixed: "1", repeat: "6" });
    expect(decimalParts(rat(1, 7))).toMatchObject({ whole: "0", fixed: "", repeat: "142857" });
    expect(decimalParts(rat(5, 12))).toMatchObject({ whole: "0", fixed: "41", repeat: "6" });
  });

  it("agrees with isTerminating", () => {
    for (const d of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 20, 25]) {
      const r = rat(1, d);
      expect(isRepeating(r), `1/${d}`).toBe(!isTerminating(r));
    }
  });

  it("writes the bar only over the repeating digits", () => {
    expect(fmtRepeating(rat(1, 3))).toBe(`0.3${OVERLINE}`);
    expect(fmtRepeating(rat(1, 6))).toBe(`0.1${"6" + OVERLINE}`);
    expect(fmtRepeating(rat(1, 4))).toBe("0.25");
    expect(fmtRepeating(rat(-1, 3))).toBe(`${MINUS}0.3${OVERLINE}`);
  });

  it("round-trips: the parts rebuild the value", () => {
    const anyRat = fc.tuple(fc.integer({ min: -200, max: 200 }), fc.integer({ min: 1, max: 60 })).map(([n, d]) => rat(n, d));
    fc.assert(fc.property(anyRat, (a) => {
      const p = decimalParts(a);
      // value = whole.fixed + repeat / (10^|fixed| * (10^|repeat| - 1))
      // 1/58 has a 28-digit repetend, and 10^28 is past Number.MAX_SAFE_INTEGER,
      // so the *check* cannot be done exactly in doubles. Skip those: the value
      // under test is still exact, only this reconstruction is not.
      if (p.fixed.length + p.repeat.length > 15) return true;
      const whole = rat(Number(p.whole));
      const fixed = p.fixed ? rat(Number(p.fixed), 10 ** p.fixed.length) : rat(0);
      const repeat = p.repeat
        ? rat(Number(p.repeat), (10 ** p.repeat.length - 1) * 10 ** p.fixed.length)
        : rat(0);
      const magnitude = add(add(whole, fixed), repeat);
      return eq(p.negative ? neg(magnitude) : magnitude, a);
    }));
  });
});
