// Merges content/curriculum/*.json into src/data/curriculum.json.
//
// Validates every source file against skill.schema.json, then adds a `chapters`
// block whose quarters come from design/tokens.json -> structure.quarterChapters
// (the tokens file is the authority for which chapter sits in which quarter).
//
// Run: pnpm curriculum

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import Ajv from "ajv/dist/2020.js";

const ROOT = resolve(import.meta.dirname, "..");
const REGISTRY_DIR = join(ROOT, "content", "curriculum");
const TOKENS = join(ROOT, "design", "tokens.json");
const OUT = join(ROOT, "src", "data", "curriculum.json");

interface Chapter {
  id: string;
  n: number;
  quarter: number;
  name: string;
  tnCluster?: string;
}

interface Skill {
  id: string;
  honors: boolean;
  chapter?: string;
  quarter?: number;
  attachTo?: string[];
  [k: string]: unknown;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function main(): void {
  const schema = readJson<object>(join(REGISTRY_DIR, "skill.schema.json"));
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);

  const files = readdirSync(REGISTRY_DIR)
    .filter((f) => f.endsWith(".json") && f !== "skill.schema.json")
    .sort();

  const skills: Skill[] = [];
  const chapters: Chapter[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const doc = readJson<{ chapters?: Chapter[]; skills: Skill[] }>(join(REGISTRY_DIR, file));
    if (!validate(doc)) {
      const errs = (validate.errors ?? []).map((e) => `  ${e.instancePath} ${e.message}`).join("\n");
      throw new Error(`${file} failed skill.schema.json:\n${errs}`);
    }
    for (const c of doc.chapters ?? []) {
      if (chapters.some((x) => x.id === c.id)) throw new Error(`duplicate chapter ${c.id} in ${file}`);
      chapters.push(c);
    }
    for (const s of doc.skills) {
      if (seen.has(s.id)) throw new Error(`duplicate skill id ${s.id} in ${file}`);
      seen.add(s.id);
      skills.push(s);
    }
  }

  // Quarters come from tokens.json, not from the per-file chapter blocks.
  const tokens = readJson<{ structure: { quarterChapters: Record<string, number[]>; subSkills: number; honorsSkills: number } }>(TOKENS);
  const quarterOf = new Map<number, number>();
  for (const [key, ns] of Object.entries(tokens.structure.quarterChapters)) {
    const q = Number(key.replace(/^q/, ""));
    for (const n of ns) quarterOf.set(n, q);
  }

  chapters.sort((a, b) => a.n - b.n);
  for (const c of chapters) {
    const q = quarterOf.get(c.n);
    if (q === undefined) throw new Error(`chapter ${c.id} (n=${c.n}) is not in tokens.structure.quarterChapters`);
    if (c.quarter !== q) {
      console.warn(`  chapter ${c.id}: registry quarter ${c.quarter} -> tokens quarter ${q}`);
      c.quarter = q;
    }
  }

  const core = skills.filter((s) => !s.honors);
  const honors = skills.filter((s) => s.honors);

  // The counts in tokens.json are the contract; fail loudly rather than drift.
  if (skills.length !== tokens.structure.subSkills) {
    throw new Error(`skill count ${skills.length} != tokens.structure.subSkills ${tokens.structure.subSkills}`);
  }
  if (honors.length !== tokens.structure.honorsSkills) {
    throw new Error(`honors count ${honors.length} != tokens.structure.honorsSkills ${tokens.structure.honorsSkills}`);
  }

  const out = {
    generated: "scripts/build-curriculum.ts — do not edit by hand",
    counts: { total: skills.length, core: core.length, honors: honors.length },
    chapters,
    skills,
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`curriculum.json: ${skills.length} skills (${core.length} core + ${honors.length} honors), ${chapters.length} chapters`);
}

main();
