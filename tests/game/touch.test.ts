import { describe, it, expect, vi, afterEach } from "vitest";
import { touchMode, mergeTurn, applyHold, holdTurn, NO_HOLD } from "../../src/game/touch";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("touchMode", () => {
  it("is true when the device reports touch points", () => {
    vi.stubGlobal("navigator", { maxTouchPoints: 2 });
    expect(touchMode()).toBe(true);
  });
  it("is false on a mouse-only device", () => {
    vi.stubGlobal("navigator", { maxTouchPoints: 0 });
    expect(touchMode()).toBe(false);
  });
  it("is false when there is no navigator at all", () => {
    vi.stubGlobal("navigator", undefined);
    expect(touchMode()).toBe(false);
  });
});

describe("mergeTurn", () => {
  it("adds keyboard and touch", () => {
    expect(mergeTurn(1, 0)).toBe(1);
    expect(mergeTurn(-1, 0)).toBe(-1);
    expect(mergeTurn(0, 1)).toBe(1);
    expect(mergeTurn(0, -1)).toBe(-1);
    expect(mergeTurn(0, 0)).toBe(0);
  });
  it("clamps opposing inputs to level flight", () => {
    expect(mergeTurn(1, -1)).toBe(0);
    expect(mergeTurn(-1, 1)).toBe(0);
  });
});

describe("applyHold", () => {
  it("sets and clears each side", () => {
    const left = applyHold(NO_HOLD, "left-down");
    expect(left).toEqual({ left: true, right: false });
    expect(applyHold(left, "left-up")).toEqual(NO_HOLD);
    const right = applyHold(NO_HOLD, "right-down");
    expect(right).toEqual({ left: false, right: true });
    expect(applyHold(right, "right-up")).toEqual(NO_HOLD);
  });
  it("holds both sides independently", () => {
    const both = applyHold(applyHold(NO_HOLD, "left-down"), "right-down");
    expect(holdTurn(both)).toBe(0);
    expect(applyHold(both, "left-up")).toEqual({ left: false, right: true });
  });
  it("release-all clears a stuck hold", () => {
    const both = applyHold(applyHold(NO_HOLD, "left-down"), "right-down");
    expect(applyHold(both, "release-all")).toEqual(NO_HOLD);
  });
});

describe("holdTurn", () => {
  it("banks a single held side", () => {
    expect(holdTurn(applyHold(NO_HOLD, "left-down"))).toBe(-1);
    expect(holdTurn(applyHold(NO_HOLD, "right-down"))).toBe(1);
  });
});
