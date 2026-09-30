import { describe, it, expect } from "vitest";
import { inputKindFor } from "../../src/game/ui/inputKind";

describe("choosing an answer input", () => {
  // Generators attach options to almost every problem, so options alone must
  // not decide the input. This was the bug: every numeric problem rendered as
  // four pick rows and the typed box (and keypad) never appeared.
  it("types a numeric problem even when it carries distractor options", () => {
    expect(inputKindFor("numeric", true)).toBe("typed");
    expect(inputKindFor("fraction", true)).toBe("typed");
  });

  it("picks a multiple-choice or pick-one problem", () => {
    expect(inputKindFor("multiple-choice", true)).toBe("pick");
    expect(inputKindFor("pick-one:greater", true)).toBe("pick");
    expect(inputKindFor("yes-no", true)).toBe("pick");
  });

  it("keeps the formats the typed box cannot parse on the pick rows", () => {
    expect(inputKindFor("sci-notation", true)).toBe("pick");
    expect(inputKindFor("expression", true)).toBe("pick");
  });

  it("types anything with no options it can show", () => {
    expect(inputKindFor("multiple-choice", false)).toBe("typed");
  });

  it("answers the grid formats on the figure", () => {
    expect(inputKindFor("plot-point", true)).toBe("grid");
    expect(inputKindFor("drag-line", false)).toBe("grid");
    expect(inputKindFor("shade-region", true)).toBe("grid");
  });

  it("reorders the order format", () => {
    expect(inputKindFor("order", true)).toBe("order");
    expect(inputKindFor("order", false)).toBe("order");
  });
});