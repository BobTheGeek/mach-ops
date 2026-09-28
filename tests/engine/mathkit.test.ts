import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mathKitFor, answerInputFor, MATH_KIT_NAME, ANSWER_INPUT_NAME } from "../../src/engine/mathkit";

const ROOT = join(import.meta.dirname, "..", "..");

interface Skill { id: string; reps: string[]; formats: string[] }
const curriculum = JSON.parse(readFileSync(join(ROOT, "src", "data", "curriculum.json"), "utf8")) as { skills: Skill[] };

describe("representation to Math Kit", () => {
  it("maps the reconciliation table's examples", () => {
    expect(mathKitFor("number-line")).toBe("MK-1");
    expect(mathKitFor("scatter-plot-with-line")).toBe("MK-2");
    expect(mathKitFor("debt-table")).toBe("MK-3");
    expect(mathKitFor("hanger-diagram")).toBe("MK-4");
    expect(mathKitFor("tree-diagram")).toBe("MK-5");
    expect(mathKitFor("side-by-side-box-plots")).toBe("MK-6");
    expect(mathKitFor("transversal-diagram")).toBe("MK-7");
    expect(mathKitFor("can-label-net")).toBe("MK-8");
  });

  it("sends manual-only illustrations to MK-0, not to a live figure component", () => {
    for (const rep of ["long-division", "pour-demo", "algebra-trick-10x", "test-point"]) {
      expect(mathKitFor(rep), rep).toBe("MK-0");
    }
  });

  it("covers every representation named anywhere in the registry", () => {
    const missing = new Set<string>();
    for (const s of curriculum.skills) {
      for (const rep of s.reps) if (mathKitFor(rep) === null) missing.add(`${rep} (${s.id})`);
    }
    expect([...missing]).toEqual([]);
  });

  it("returns null for something that is not a representation", () => {
    expect(mathKitFor("not-a-rep")).toBeNull();
  });

  it("names every Math Kit id", () => {
    for (const id of Object.keys(MATH_KIT_NAME)) expect(MATH_KIT_NAME[id as keyof typeof MATH_KIT_NAME]).toBeTruthy();
  });
});

describe("answer format to Answer Input", () => {
  it("maps the reconciliation table's rows", () => {
    expect(answerInputFor("numeric")).toBe("CL-02");
    expect(answerInputFor("expression")).toBe("CL-02-expr");
    expect(answerInputFor("fraction")).toBe("AI-1");
    expect(answerInputFor("sci-notation")).toBe("AI-2");
    expect(answerInputFor("plot-point")).toBe("AI-3");
    expect(answerInputFor("drag-line")).toBe("AI-4");
    expect(answerInputFor("shade-region")).toBe("AI-5");
    expect(answerInputFor("order")).toBe("AI-7");
    expect(answerInputFor("table-fill")).toBe("AI-8");
  });

  it("sends every pick-style format to AI-6", () => {
    for (const f of ["multiple-choice", "yes-no", "graph-select", "shape-select", "likelihood-select", "box-plot-read", "number-line-select", "pick-one:up|down"] as const) {
      expect(answerInputFor(f), f).toBe("AI-6");
    }
  });

  it("covers every format named anywhere in the registry", () => {
    for (const s of curriculum.skills) {
      for (const f of s.formats) {
        const ai = answerInputFor(f as Parameters<typeof answerInputFor>[0]);
        expect(ANSWER_INPUT_NAME[ai], `${s.id} format ${f}`).toBeTruthy();
      }
    }
  });
});
