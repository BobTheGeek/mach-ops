import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { mulberry32, hash32, sha1, pick, int, shuffle } from "../../src/engine/rng";

describe("hash32", () => {
  it("is deterministic", () => {
    expect(hash32("ns.1.4|1|7")).toBe(hash32("ns.1.4|1|7"));
  });

  it("returns an unsigned 32-bit integer for any string", () => {
    fc.assert(fc.property(fc.string(), (s) => {
      const h = hash32(s);
      return Number.isInteger(h) && h >= 0 && h <= 0xffffffff;
    }));
  });

  it("separates near-identical seeds", () => {
    expect(hash32("ns.1.4|1|7")).not.toBe(hash32("ns.1.4|1|8"));
    expect(hash32("ns.1.4|1|7")).not.toBe(hash32("ns.1.5|1|7"));
  });
});

describe("mulberry32", () => {
  it("replays identically from the same seed", () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it("stays inside [0, 1)", () => {
    const r = mulberry32(99);
    for (let i = 0; i < 10000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("spreads roughly evenly across ten buckets", () => {
    const r = mulberry32(2024);
    const buckets = new Array<number>(10).fill(0);
    for (let i = 0; i < 100000; i++) buckets[Math.floor(r() * 10)]! += 1;
    for (const b of buckets) expect(b / 100000).toBeGreaterThan(0.09);
  });
});

describe("sha1", () => {
  // Published test vectors.
  it("matches known vectors", () => {
    expect(sha1("")).toBe("da39a3ee5e6b4b0d3255bfef95601890afd80709");
    expect(sha1("abc")).toBe("a9993e364706816aba3e25717850c26c9cd0d89d");
    expect(sha1("The quick brown fox jumps over the lazy dog")).toBe("2fd4e1c67a2d28fced849ee1bb76e7391b93eb12");
  });

  it("handles multi-byte characters and long input", () => {
    expect(sha1("−3,500 ft · 24.5 KFT")).toMatch(/^[0-9a-f]{40}$/);
    expect(sha1("x".repeat(1000))).toMatch(/^[0-9a-f]{40}$/);
  });

  it("always returns 40 lowercase hex characters", () => {
    fc.assert(fc.property(fc.string(), (s) => /^[0-9a-f]{40}$/.test(sha1(s))));
  });
});

describe("draw helpers", () => {
  it("int stays within the inclusive bounds", () => {
    const r = mulberry32(5);
    for (let i = 0; i < 10000; i++) {
      const v = int(r, -30, 30);
      expect(v).toBeGreaterThanOrEqual(-30);
      expect(v).toBeLessThanOrEqual(30);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it("int reaches both ends of its range", () => {
    const r = mulberry32(5);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(int(r, 1, 4));
    expect([...seen].sort()).toEqual([1, 2, 3, 4]);
  });

  it("pick always returns a member of the list", () => {
    const r = mulberry32(11);
    const xs = ["a", "b", "c"] as const;
    for (let i = 0; i < 1000; i++) expect(xs).toContain(pick(r, xs));
  });

  it("shuffle is a permutation and leaves the input alone", () => {
    const r = mulberry32(3);
    const xs = [1, 2, 3, 4, 5];
    const out = shuffle(r, xs);
    expect(xs).toEqual([1, 2, 3, 4, 5]);
    expect(out.slice().sort((a, b) => a - b)).toEqual(xs);
  });
});
