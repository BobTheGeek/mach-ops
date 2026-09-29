import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { rat, eq, cmp, toNumber, type Rational } from "../../src/engine/rational";
import {
  sortAsc, sum, mean, median, modes, fiveNumber, iqr, range, mad,
  quartilesIncludingMedian, shapeOf,
} from "../../src/engine/stats";

const R = (...ns: number[]): Rational[] => ns.map((n) => rat(n));
const N = (r: Rational): number => toNumber(r);

describe("centre", () => {
  it("means exactly, with no floating-point drift", () => {
    // 1/3 must stay 1/3: as a decimal it would never come back.
    expect(mean(R(1, 1, 2))).toEqual(rat(4, 3));
    expect(mean(R(2, 4, 6, 8))).toEqual(rat(5));
  });

  it("medians the middle of the SORTED list", () => {
    // The registry's median-unsorted error: the middle of [9,2,5] is 5, not 2.
    expect(median(R(9, 2, 5))).toEqual(rat(5));
    expect(median(R(1, 2, 3, 4))).toEqual(rat(5, 2));
  });

  it("returns no mode when nothing repeats, and every tied mode when several do", () => {
    expect(modes(R(1, 2, 3))).toEqual([]);
    expect(modes(R(1, 2, 2, 3))).toEqual([rat(2)]);
    expect(modes(R(3, 3, 1, 1, 5))).toEqual([rat(1), rat(3)]);
  });
});

describe("spread", () => {
  it("ranges max minus min", () => {
    expect(range(R(4, 19, 7))).toEqual(rat(15));
  });

  it("excludes the median from both halves on an odd count", () => {
    // 1 2 3 4 5 6 7 -> lower 1,2,3 upper 5,6,7 -> Q1 2, Q3 6, IQR 4.
    const f = fiveNumber(R(1, 2, 3, 4, 5, 6, 7));
    expect(f).toEqual({ min: rat(1), q1: rat(2), median: rat(4), q3: rat(6), max: rat(7) });
    expect(iqr(R(1, 2, 3, 4, 5, 6, 7))).toEqual(rat(4));
  });

  it("splits evenly on an even count", () => {
    // 1 2 3 4 5 6 -> lower 1,2,3 upper 4,5,6.
    expect(fiveNumber(R(1, 2, 3, 4, 5, 6))).toEqual({
      min: rat(1), q1: rat(2), median: rat(7, 2), q3: rat(5), max: rat(6),
    });
  });

  it("names the quartile mistake and keeps it distinct from the right answer", () => {
    const data = R(1, 2, 3, 4, 5, 6, 7);
    const wrong = quartilesIncludingMedian(data);
    // Including the median pulls both quartiles toward it.
    expect(wrong.q1).toEqual(rat(5, 2));
    expect(wrong.q3).toEqual(rat(11, 2));
    expect(eq(wrong.q1, fiveNumber(data).q1)).toBe(false);
  });

  it("computes MAD as the mean distance from the mean", () => {
    // mean 5; distances 3,1,1,3 -> 2.
    expect(mad(R(2, 4, 6, 8))).toEqual(rat(2));
    // A set with every value equal has no spread at all.
    expect(mad(R(7, 7, 7))).toEqual(rat(0));
  });

  it("refuses a five-number summary of fewer than four values", () => {
    expect(() => fiveNumber(R(1, 2, 3))).toThrow();
  });
});

describe("shape", () => {
  it("reads the lean from the mean against the median", () => {
    expect(shapeOf(R(1, 2, 3, 4, 5))).toBe("symmetric");
    // One large value drags the mean up and the tail points right.
    expect(shapeOf(R(1, 2, 3, 4, 40))).toBe("right-skewed");
    expect(shapeOf(R(1, 30, 31, 32, 33))).toBe("left-skewed");
  });
});

describe("properties", () => {
  const values = fc.array(fc.integer({ min: -50, max: 50 }).map((n) => rat(n)), { minLength: 4, maxLength: 12 });

  it("puts the mean between the smallest and the largest value", () => {
    fc.assert(fc.property(values, (vs) => {
      const s = sortAsc(vs);
      const m = mean(vs);
      expect(cmp(m, s[0]!)).toBeGreaterThanOrEqual(0);
      expect(cmp(m, s[s.length - 1]!)).toBeLessThanOrEqual(0);
    }));
  });

  it("never produces a negative IQR, MAD or range", () => {
    fc.assert(fc.property(values, (vs) => {
      expect(N(iqr(vs))).toBeGreaterThanOrEqual(0);
      expect(N(mad(vs))).toBeGreaterThanOrEqual(0);
      expect(N(range(vs))).toBeGreaterThanOrEqual(0);
    }));
  });

  it("keeps the five numbers in order", () => {
    fc.assert(fc.property(values, (vs) => {
      const f = fiveNumber(vs);
      expect(cmp(f.min, f.q1)).toBeLessThanOrEqual(0);
      expect(cmp(f.q1, f.median)).toBeLessThanOrEqual(0);
      expect(cmp(f.median, f.q3)).toBeLessThanOrEqual(0);
      expect(cmp(f.q3, f.max)).toBeLessThanOrEqual(0);
    }));
  });

  it("is unchanged by shuffling the input", () => {
    fc.assert(fc.property(values, fc.integer({ min: 0, max: 1000 }), (vs, k) => {
      const rotated = [...vs.slice(k % vs.length), ...vs.slice(0, k % vs.length)];
      expect(mean(rotated)).toEqual(mean(vs));
      expect(median(rotated)).toEqual(median(vs));
      expect(fiveNumber(rotated)).toEqual(fiveNumber(vs));
    }));
  });

  it("shifts every measure of centre by a constant and leaves every spread alone", () => {
    fc.assert(fc.property(values, fc.integer({ min: -20, max: 20 }), (vs, k) => {
      const moved = vs.map((v) => rat(v.n + k * v.d, v.d));
      expect(mean(moved)).toEqual(rat(mean(vs).n + k * mean(vs).d, mean(vs).d));
      expect(iqr(moved)).toEqual(iqr(vs));
      expect(mad(moved)).toEqual(mad(vs));
      expect(range(moved)).toEqual(range(vs));
    }));
  });

  it("sums to the mean times the count", () => {
    fc.assert(fc.property(values, (vs) => {
      const total = mean(vs);
      expect(eq(sum(vs), rat(total.n * vs.length, total.d))).toBe(true);
    }));
  });
});
