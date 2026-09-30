import { describe, it, expect } from "vitest";
import { createNoise2D, fbm2, periodicProfile } from "../../src/game/noise";

describe("seeded Perlin noise", () => {
  it("is deterministic: the same seed draws the same field", () => {
    const a = createNoise2D("ch1-01");
    const b = createNoise2D("ch1-01");
    for (let i = 0; i < 50; i++) {
      expect(a(i * 0.31, i * 0.17)).toBe(b(i * 0.31, i * 0.17));
    }
  });

  it("gives different seeds different fields", () => {
    const a = createNoise2D("ch1-01");
    const b = createNoise2D("ch1-02");
    let differences = 0;
    for (let i = 0; i < 50; i++) {
      if (a(i * 0.31, i * 0.17) !== b(i * 0.31, i * 0.17)) differences += 1;
    }
    expect(differences).toBeGreaterThan(40);
  });

  it("stays inside [-1, 1] and is smooth between samples", () => {
    const noise = createNoise2D(7);
    for (let x = -8; x <= 8; x += 0.05) {
      let previous = noise(x, -8);
      for (let y = -8 + 0.05; y <= 8; y += 0.05) {
        const v = noise(x, y);
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
        expect(Math.abs(v - previous)).toBeLessThan(0.2);
        previous = v;
      }
    }
  });

  it("fbm keeps the range and mixes octaves", () => {
    const noise = createNoise2D("fbm");
    const single = fbm2(noise, 3.2, 4.7, 1);
    const multi = fbm2(noise, 3.2, 4.7, 5);
    expect(single).toBe(noise(3.2, 4.7));
    expect(multi).toBeGreaterThanOrEqual(-1);
    expect(multi).toBeLessThanOrEqual(1);
    expect(multi).not.toBe(single);
  });

  it("repeats exactly at the cycle, which is what makes the world seamless", () => {
    const noise = createNoise2D("coast");
    for (let t = 0; t <= 1280; t += 97) {
      expect(periodicProfile(noise, t, 1280, 1.2)).toBeCloseTo(
        periodicProfile(noise, t + 1280, 1280, 1.2),
        12,
      );
    }
  });

  it("gives each phase its own profile", () => {
    const noise = createNoise2D("coast");
    let differences = 0;
    for (let t = 0; t < 1280; t += 40) {
      if (periodicProfile(noise, t, 1280, 0) !== periodicProfile(noise, t, 1280, 5)) differences += 1;
    }
    expect(differences).toBeGreaterThan(25);
  });
});