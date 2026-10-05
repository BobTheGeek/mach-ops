import { describe, it, expect } from "vitest";
import { applyKey, KEYPAD_ROWS } from "../../src/game/ui/keypad";

describe("applyKey", () => {
  it("appends a digit", () => expect(applyKey("4", "0")).toBe("40"));
  it("appends a fraction, sign and percent", () => {
    expect(applyKey("3", "/")).toBe("3/");
    expect(applyKey("3/", "-")).toBe("3/-");
    expect(applyKey("25", "%")).toBe("25%");
  });
  it("backspaces", () => {
    expect(applyKey("40", "\u232B")).toBe("4");
    expect(applyKey("", "\u232B")).toBe("");
  });
});

describe("KEYPAD_ROWS", () => {
  it("keeps the four rows of four the card shipped", () => {
    expect(KEYPAD_ROWS).toHaveLength(4);
    for (const row of KEYPAD_ROWS) expect(row).toHaveLength(4);
  });
});
