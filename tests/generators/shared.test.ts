import { describe, it, expect } from "vitest";
import { buildChoice, acceptRational, acceptOrder, coerce, bind, numberLineSpan } from "../../src/generators/shared";
import { rat, eq, type Rational } from "../../src/engine/rational";
import { mulberry32 } from "../../src/engine/rng";
import type { Answer } from "../../src/engine/types";

const fmt = (a: Answer): string => {
  const r = a as Rational;
  return r.d === 1 ? String(r.n) : `${r.n}/${r.d}`;
};

describe("buildChoice", () => {
  it("returns 3 distractors and 4 options by default", () => {
    const c = buildChoice(mulberry32(1), rat(10), [
      { tag: "a", value: rat(1) }, { tag: "b", value: rat(2) }, { tag: "c", value: rat(3) },
    ], fmt);
    expect(c.distractors).toHaveLength(3);
    expect(c.options).toHaveLength(4);
    expect(c.options[c.correctIndex]).toEqual(rat(10));
  });

  it("honours a narrower option count", () => {
    const c = buildChoice(mulberry32(1), rat(10), [{ tag: "a", value: rat(1) }], fmt, 2);
    expect(c.distractors).toHaveLength(1);
    expect(c.options).toHaveLength(2);
  });

  it("skips a recipe that collides with the correct answer", () => {
    const c = buildChoice(mulberry32(2), rat(5), [
      { tag: "collides", value: rat(5) }, { tag: "b", value: rat(2) }, { tag: "c", value: rat(3) },
    ], fmt);
    expect(c.distractors.map((d) => d.tag)).not.toContain("collides");
  });

  it("skips a recipe that duplicates an earlier one", () => {
    const c = buildChoice(mulberry32(3), rat(9), [
      { tag: "a", value: rat(2) }, { tag: "dup", value: rat(2) }, { tag: "c", value: rat(3) },
    ], fmt);
    expect(c.distractors.map((d) => d.tag)).not.toContain("dup");
  });

  it("skips a recipe whose `when` is false", () => {
    const c = buildChoice(mulberry32(4), rat(9), [
      { tag: "off", value: rat(2), when: false }, { tag: "b", value: rat(3) },
    ], fmt);
    expect(c.distractors.map((d) => d.tag)).not.toContain("off");
  });

  it("fills with the magnitude fallback when fewer than 3 recipes survive", () => {
    const c = buildChoice(mulberry32(5), rat(7), [{ tag: "a", value: rat(1) }], fmt);
    expect(c.distractors).toHaveLength(3);
    expect(c.distractors.filter((d) => d.tag === "magnitude")).toHaveLength(2);
  });

  it("never offers a fraction as a fallback for an integer answer", () => {
    for (let seed = 0; seed < 200; seed++) {
      const c = buildChoice(mulberry32(seed), rat(7), [], fmt);
      for (const d of c.distractors) expect((d.value as Rational).d).toBe(1);
    }
  });

  it("gives every option a distinct value", () => {
    for (let seed = 0; seed < 200; seed++) {
      const c = buildChoice(mulberry32(seed), rat(12), [{ tag: "a", value: rat(6) }], fmt);
      const keys = c.options.map((o) => fmt(o));
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("maps every distractor's formatted text to its tag", () => {
    const c = buildChoice(mulberry32(6), rat(10), [
      { tag: "a", value: rat(1) }, { tag: "b", value: rat(2) }, { tag: "c", value: rat(3) },
    ], fmt);
    expect(c.errorTagsByAnswer).toEqual({ "1": "a", "2": "b", "3": "c" });
  });
});

describe("acceptance", () => {
  it("accepts every equivalent written form", () => {
    const ok = acceptRational(rat(3, 4));
    for (const input of ["3/4", "0.75", "75%", "6/8", 0.75]) expect(ok(input as Answer), String(input)).toBe(true);
    for (const input of ["4/3", "0.7", 1]) expect(ok(input as Answer), String(input)).toBe(false);
  });

  it("accepts an ordered answer only in the right order", () => {
    const ok = acceptOrder([rat(-3), rat(0), rat(1, 2)]);
    expect(ok([rat(-3), rat(0), rat(1, 2)])).toBe(true);
    expect(ok(["-3", "0", "1/2"])).toBe(true);
    expect(ok([rat(0), rat(-3), rat(1, 2)])).toBe(false);
    expect(ok([rat(-3), rat(0)])).toBe(false);
  });

  it("coerces numbers, strings and rationals, and rejects the rest", () => {
    expect(eq(coerce(0.25)!, rat(1, 4))).toBe(true);
    expect(eq(coerce("−3,500")!, rat(-3500))).toBe(true);
    expect(coerce("nonsense")).toBeNull();
    expect(coerce(Number.NaN)).toBeNull();
  });
});

describe("prompt helpers", () => {
  it("binds slots and leaves unknown ones visible", () => {
    expect(bind("{{a}} minus {{b}}", { a: "7", b: "3" })).toBe("7 minus 3");
    expect(bind("{{missing}}", {})).toBe("{{missing}}");
  });

  it("spans a number line around the values and zero", () => {
    expect(numberLineSpan([3, 8], 2)).toEqual({ min: -2, max: 10 });
    expect(numberLineSpan([-4, -1], 1)).toEqual({ min: -5, max: 1 });
  });
});
