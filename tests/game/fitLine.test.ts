import { describe, it, expect } from "vitest";
import { fitLine, type DetailPart } from "../../src/game/ui/fitLine";

/** Every character is 10 px, so the arithmetic in the tests is plain. */
const widthOf = (s: string): number => s.length * 10;

const part = (text: string, priority: number): DetailPart => ({ text, priority });

describe("fitLine", () => {
  it("returns the whole line when it fits", () => {
    const parts = [part("BOSS", 60), part("MIXED REVIEW", 20), part("12 PROBLEMS", 50)];
    const line = fitLine(parts, 400, widthOf);
    expect(line).toBe("BOSS · MIXED REVIEW · 12 PROBLEMS");
  });

  it("drops the lowest-priority segment first", () => {
    // Full line is 40 chars = 400 px; room 320 drops "3 PREP" (priority 10).
    const parts = [part("BOSS", 60), part("12 PROBLEMS", 50), part("~2 MIN", 30), part("3 PREP", 10)];
    expect(fitLine(parts, 320, widthOf)).toBe("BOSS · 12 PROBLEMS · ~2 MIN");
  });

  it("drops rightmost on a priority tie, so earlier segments survive", () => {
    const parts = [part("BOSS", 60), part("AAAA", 20), part("BBBB", 20)];
    expect(fitLine(parts, 170, widthOf)).toBe("BOSS · AAAA");
  });

  it("keeps dropping, in priority order, until the line fits", () => {
    // Room 220: drop prep (10) -> 400; drop focus (20) -> 320; drop eta (30) -> 210 fits.
    const parts = [part("BOSS", 60), part("MIXED REVIEW", 20), part("12 PROBLEMS", 50), part("~2 MIN", 30), part("3 PREP", 10)];
    expect(fitLine(parts, 220, widthOf)).toBe("BOSS · 12 PROBLEMS");
  });

  it("never drops the highest-priority segment and truncates as a last resort", () => {
    const parts = [part("CAPSTONE", 60), part("12 PROBLEMS", 50)];
    expect(fitLine(parts, 60, widthOf)).toBe("CAPST…");
  });

  it("returns an empty string for no parts", () => {
    expect(fitLine([], 100, widthOf)).toBe("");
  });
});
