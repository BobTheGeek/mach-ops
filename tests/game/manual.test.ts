import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseManual, SECTIONS } from "../../src/game/manual";
import curriculum from "../../src/data/curriculum.json";

const registry = (curriculum as unknown as {
  skills: { id: string; chapter?: string; honors: boolean; attachTo?: string[] }[];
}).skills;

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
      // Core skills carry a chapter; an honors skill carries the chapters it is
      // attached to instead, and its page names the first of them.
      const skill = registry.find((s) => s.id === page.skill)!;
      const expected = skill.chapter ?? skill.attachTo?.[0];
      expect(`ch${page.chapter}`, `${f} chapter`).toBe(expected);
      expect(page.honors, `${f} honors`).toBe(skill.honors);
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

describe("the Khan Academy lesson link", () => {
  it("is a khanacademy.org URL on every page", () => {
    for (const f of pages) {
      expect(parseManual(read(f)).khan, f).toMatch(/^https:\/\/www\.khanacademy\.org\/math\//);
    }
  });

  // The footer button reads the front matter; the body carries the same URL as a
  // markdown link. If those two drift, the button sends him somewhere the page
  // does not claim to send him.
  it("matches the link at the foot of the same page", () => {
    for (const f of pages) {
      const raw = read(f);
      const link = /\[Watch on Khan Academy\]\(([^)]+)\)/.exec(raw);
      expect(link, `${f} has no Watch on Khan Academy link`).not.toBeNull();
      expect(link![1], f).toBe(parseManual(raw).khan);
    }
  });

  it("points at a course unit, not at the site root", () => {
    for (const f of pages) {
      const path = new URL(parseManual(read(f)).khan).pathname.split("/").filter(Boolean);
      // /math/<course>/<unit>
      expect(path.length, `${f} ${path.join("/")}`).toBeGreaterThanOrEqual(3);
    }
  });
});
