import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseManual, SECTIONS } from "../../src/game/manual";

const DIR = join(import.meta.dirname, "..", "..", "src", "data", "manual");
const pages = readdirSync(DIR).filter((f) => f.endsWith(".md"));
const read = (f: string): string => readFileSync(join(DIR, f), "utf8");

describe("parseManual", () => {
  it("reads the front matter of every shipped page", () => {
    for (const f of pages) {
      const page = parseManual(read(f));
      expect(page.skill, f).toBe(f.replace(/\.md$/, ""));
      expect(page.title.length, f).toBeGreaterThan(0);
      expect(page.standards.length, f).toBeGreaterThan(0);
      expect(page.chapter, f).toBe(1);
      expect(page.khan, f).toMatch(/^https:\/\//);
    }
  });

  it("splits every page into the six blocks the renderer keys on", () => {
    for (const f of pages) {
      const page = parseManual(read(f));
      for (const name of SECTIONS) {
        expect(page.blocks[name], `${f} / ${name}`).toBeTruthy();
      }
    }
  });

  it("finds the numbered steps under How to solve it", () => {
    for (const f of pages) {
      const page = parseManual(read(f));
      expect(page.steps.length, f).toBeGreaterThanOrEqual(3);
      expect(page.steps.length, f).toBeLessThanOrEqual(6);
      expect(page.steps.every((s) => s.length > 0), f).toBe(true);
    }
  });

  it("splits each Watch out for bullet into a mistake and a fix", () => {
    for (const f of pages) {
      const page = parseManual(read(f));
      expect(page.watchOut.length, f).toBeGreaterThanOrEqual(2);
      for (const w of page.watchOut) {
        expect(w.mistake.length, f).toBeGreaterThan(0);
        expect(w.fix.length, f).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the live slots for the app to fill", () => {
    for (const f of pages) {
      const page = parseManual(read(f));
      expect(page.blocks["Worked example"]).toBe("{{worked-example}}");
      expect(page.blocks["Try one"]).toBe("{{try-one}}");
    }
  });

  it("survives markdown with no front matter", () => {
    const page = parseManual("## What it is\n\nJust a body.\n");
    expect(page.skill).toBe("");
    expect(page.blocks["What it is"]).toBe("Just a body.");
    expect(page.steps).toEqual([]);
  });
});
