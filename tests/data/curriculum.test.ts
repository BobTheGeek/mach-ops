import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Ajv from "ajv/dist/2020.js";
import { IMPLEMENTED_SKILLS } from "../../src/generators/index";

const ROOT = join(import.meta.dirname, "..", "..");
const read = <T,>(...p: string[]): T => JSON.parse(readFileSync(join(ROOT, ...p), "utf8")) as T;

interface Skill { id: string; honors: boolean; chapter?: string; errors: { tag: string }[]; tiers: string[] }
interface Curriculum { counts: { total: number; core: number; honors: number }; chapters: { id: string; n: number; quarter: number }[]; skills: Skill[] }

const curriculum = read<Curriculum>("src", "data", "curriculum.json");
const tokens = read<{ structure: { subSkills: number; honorsSkills: number; quarterChapters: Record<string, number[]> } }>("design", "tokens.json");
const schedule = read<{ units: { id: string; quarter: number }[]; honors: Record<string, string[]> }>("src", "data", "schedule.json");

describe("curriculum.json", () => {
  it("holds 83 skills: 54 core plus 29 honors, matching tokens.json", () => {
    expect(curriculum.counts).toEqual({ total: 83, core: 54, honors: 29 });
    expect(curriculum.counts.total).toBe(tokens.structure.subSkills);
    expect(curriculum.counts.honors).toBe(tokens.structure.honorsSkills);
  });

  it("still validates against skill.schema.json", () => {
    const schema = read<object>("content", "curriculum", "skill.schema.json");
    const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
    const files = readdirSync(join(ROOT, "content", "curriculum")).filter((f) => f.endsWith(".json") && f !== "skill.schema.json");
    for (const f of files) {
      const ok = validate(read<object>("content", "curriculum", f));
      expect(ok, `${f}: ${JSON.stringify(validate.errors)}`).toBe(true);
    }
  });

  it("has no duplicate skill ids", () => {
    const ids = curriculum.skills.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every skill exactly 4 tiers and at least 2 error tags", () => {
    for (const s of curriculum.skills) {
      expect(s.tiers, s.id).toHaveLength(4);
      expect(s.errors.length, s.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("uses kebab-case error tags everywhere", () => {
    for (const s of curriculum.skills) {
      for (const e of s.errors) expect(e.tag, `${s.id} tag ${e.tag}`).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("puts every chapter in the quarter tokens.json says", () => {
    const quarterOf = new Map<number, number>();
    for (const [k, ns] of Object.entries(tokens.structure.quarterChapters)) {
      for (const n of ns) quarterOf.set(n, Number(k.slice(1)));
    }
    for (const c of curriculum.chapters) expect(c.quarter, c.id).toBe(quarterOf.get(c.n));
  });
});

describe("schedule.json", () => {
  it("lists one unit per chapter, in the same quarters", () => {
    expect(schedule.units).toHaveLength(curriculum.chapters.length);
    for (const c of curriculum.chapters) {
      const unit = schedule.units.find((u) => u.id === c.id);
      expect(unit, `no schedule unit for ${c.id}`).toBeDefined();
      expect(unit!.quarter, c.id).toBe(c.quarter);
    }
  });

  it("lists 29 honors standards, matching the honors skill count", () => {
    const total = Object.values(schedule.honors).reduce((n, xs) => n + xs.length, 0);
    expect(total).toBe(curriculum.counts.honors);
  });
});

describe("Phase 1 coverage", () => {
  it("implements every Chapter 1 skill and nothing that is not in the registry", () => {
    const ch1 = curriculum.skills.filter((s) => s.chapter === "ch1").map((s) => s.id).sort();
    expect(IMPLEMENTED_SKILLS.slice().sort()).toEqual(ch1);
  });

  it("ships a Flight Manual page for every implemented skill", () => {
    const pages = readdirSync(join(ROOT, "src", "data", "manual")).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
    for (const id of IMPLEMENTED_SKILLS) expect(pages, id).toContain(id);
  });

  it("gives every manual page the six headings the renderer keys on", () => {
    const required = ["## What it is", "## How to solve it", "## Worked example", "## Watch out for", "## Try one", "## Where it shows up"];
    for (const id of IMPLEMENTED_SKILLS) {
      const md = readFileSync(join(ROOT, "src", "data", "manual", `${id}.md`), "utf8");
      for (const h of required) expect(md, `${id} is missing "${h}"`).toContain(h);
      expect(md, `${id} worked-example slot`).toContain("{{worked-example}}");
      expect(md, `${id} try-one slot`).toContain("{{try-one}}");
    }
  });

  it("gives every manual page one Watch out for bullet per registry error tag", () => {
    for (const id of IMPLEMENTED_SKILLS) {
      const skill = curriculum.skills.find((s) => s.id === id)!;
      const md = readFileSync(join(ROOT, "src", "data", "manual", `${id}.md`), "utf8");
      const section = md.split("## Watch out for")[1]?.split("\n## ")[0] ?? "";
      const bullets = section.split("\n").filter((l) => l.startsWith("- **Mistake:**")).length;
      expect(bullets, `${id} bullets vs registry tags`).toBe(skill.errors.length);
    }
  });
});
