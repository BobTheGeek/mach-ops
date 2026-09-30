import { describe, it, expect } from "vitest";
import { newFlight, stepFlight, TURN_RATE, SPEED, STRAFE } from "../../src/game/flight";

describe("the shared flight model", () => {
  it("flies straight and forward with the stick centred", () => {
    const f = newFlight();
    const s = stepFlight(f, 0, 0.1);
    expect(s.dy).toBeCloseTo(SPEED * 0.1);
    expect(s.dx).toBeCloseTo(0);
    expect(f.heading).toBe(0);
  });

  it("turns the heading at the documented rate", () => {
    const f = newFlight();
    stepFlight(f, 1, 1);
    expect(f.heading).toBeCloseTo(TURN_RATE);
    stepFlight(f, -1, 1);
    expect(f.heading).toBeCloseTo(0);
  });

  it("wraps the heading at 360 rather than growing without bound", () => {
    const f = newFlight();
    for (let i = 0; i < 10; i++) stepFlight(f, 1, 1);
    expect(f.heading).toBeGreaterThanOrEqual(0);
    expect(f.heading).toBeLessThan(360);
  });

  it("eases the roll toward the stick instead of snapping", () => {
    const f = newFlight();
    stepFlight(f, 1, 1 / 60);
    expect(f.bank).toBeGreaterThan(0);
    expect(f.bank).toBeLessThan(1);
    for (let i = 0; i < 120; i++) stepFlight(f, 1, 1 / 60);
    expect(f.bank).toBeCloseTo(1, 5);
  });

  it("banks the world sideways, opposite the stick", () => {
    const f = newFlight();
    for (let i = 0; i < 120; i++) stepFlight(f, 1, 1 / 60);
    const s = stepFlight(f, 1, 0.1);
    expect(s.dx).toBeCloseTo(-STRAFE * 0.1, 1);
  });

  it("levels out when the stick is released", () => {
    const f = newFlight();
    for (let i = 0; i < 120; i++) stepFlight(f, 1, 1 / 60);
    for (let i = 0; i < 120; i++) stepFlight(f, 0, 1 / 60);
    expect(Math.abs(f.bank)).toBeLessThan(0.01);
  });
});