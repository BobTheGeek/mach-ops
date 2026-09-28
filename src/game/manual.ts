// Flight Manual pages: load the markdown in src/data/manual and split it into the
// six blocks the renderer keys on (GENERATOR_SPEC section 8).
//
// The parser is pure and takes the markdown as a string, so it is testable
// without Vite; loadPage() is the only part that touches the bundle.

export const SECTIONS = [
  "What it is",
  "How to solve it",
  "Worked example",
  "Watch out for",
  "Try one",
  "Where it shows up",
] as const;

export type SectionName = (typeof SECTIONS)[number];

export interface ManualPage {
  skill: string;
  title: string;
  standards: string[];
  honors: boolean;
  chapter: number;
  section: string;
  khan: string;
  /** section heading -> body markdown, in document order */
  blocks: Record<SectionName, string>;
  /** the numbered steps under "How to solve it" */
  steps: string[];
  /** one "**Mistake:** ... **Fix:** ..." pair per registry error tag */
  watchOut: { mistake: string; fix: string }[];
}

/** Front matter is a small fixed shape, so this reads it without a YAML dependency. */
function parseFrontMatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  if (!m) return { meta: {}, body: raw };

  const meta: Record<string, string> = {};
  let currentKey = "";
  for (const line of m[1]!.split("\n")) {
    const kv = /^(\w+):\s*(.*)$/.exec(line);
    if (kv) {
      currentKey = kv[1]!;
      meta[currentKey] = kv[2]!.trim();
      continue;
    }
    const nested = /^\s+(\w+):\s*(.*)$/.exec(line);
    // sources.im / sources.khan land as "im" and "khan"
    if (nested) meta[nested[1]!] = nested[2]!.trim();
  }
  return { meta, body: m[2]! };
}

const unquote = (s: string): string => s.replace(/^["']|["']$/g, "").trim();

function parseList(s: string | undefined): string[] {
  if (!s) return [];
  return s.replace(/^\[|\]$/g, "").split(",").map((x) => unquote(x)).filter(Boolean);
}

export function parseManual(raw: string): ManualPage {
  const { meta, body } = parseFrontMatter(raw);

  const blocks = {} as Record<SectionName, string>;
  for (const name of SECTIONS) {
    const after = body.split(`## ${name}`)[1];
    blocks[name] = after ? (after.split("\n## ")[0] ?? "").trim() : "";
  }

  const steps = blocks["How to solve it"]
    .split("\n")
    .filter((l) => /^\d+\.\s/.test(l))
    .map((l) => l.replace(/^\d+\.\s*/, "").trim());

  const watchOut = blocks["Watch out for"]
    .split("\n")
    .filter((l) => l.startsWith("- **Mistake:**"))
    .map((l) => {
      const m = /- \*\*Mistake:\*\*\s*(.*?)\s*\*\*Fix:\*\*\s*(.*)$/.exec(l);
      return { mistake: m?.[1]?.trim() ?? l, fix: m?.[2]?.trim() ?? "" };
    });

  return {
    skill: unquote(meta.skill ?? ""),
    title: unquote(meta.title ?? ""),
    standards: parseList(meta.standards),
    honors: unquote(meta.honors ?? "false") === "true",
    chapter: Number(unquote(meta.chapter ?? "0")),
    section: unquote(meta.section ?? ""),
    khan: unquote(meta.khan ?? ""),
    blocks,
    steps,
    watchOut,
  };
}

/* ------------------------------------------------------------- loading */

const PAGES = import.meta.glob("../data/manual/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const cache = new Map<string, ManualPage>();

export function hasPage(skill: string): boolean {
  return Object.keys(PAGES).some((k) => k.endsWith(`/${skill}.md`));
}

export function loadPage(skill: string): ManualPage {
  const cached = cache.get(skill);
  if (cached) return cached;
  const key = Object.keys(PAGES).find((k) => k.endsWith(`/${skill}.md`));
  if (!key) throw new Error(`no Flight Manual page for ${skill}`);
  const page = parseManual(PAGES[key]!);
  cache.set(skill, page);
  return page;
}

export const availablePages = (): string[] =>
  Object.keys(PAGES).map((k) => k.split("/").pop()!.replace(/\.md$/, "")).sort();
