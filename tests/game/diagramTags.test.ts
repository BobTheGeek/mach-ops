import { describe, it, expect } from "vitest";
import { seriesTag } from "../../src/game/diagramTags";

describe("diagram series tags", () => {
  it("leaves an unlabelled series unlabelled by default", () => {
    expect(seriesTag(undefined, 0, false)).toBeNull();
    expect(seriesTag([], 1, false)).toBeNull();
  });

  it("keeps the card's own label when it has one", () => {
    expect(seriesTag(["FLIGHT A", "FLIGHT B"], 0, false)).toBe("FLIGHT A");
    expect(seriesTag(["FLIGHT A", "FLIGHT B"], 1, true)).toBe("FLIGHT B");
  });

  it("names untagged series A and B for the colorblind-safe HUD", () => {
    expect(seriesTag(undefined, 0, true)).toBe("A");
    expect(seriesTag(undefined, 1, true)).toBe("B");
    expect(seriesTag(undefined, 2, true)).toBe("C");
  });
});