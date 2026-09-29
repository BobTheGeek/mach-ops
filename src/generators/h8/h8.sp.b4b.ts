// h8.sp.b4b — Sample spaces for compound events (Grade 8 honors, attached to Chapter 7)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { rat, fmtInt } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "h8.sp.b4b";

type Variant =
  | "size"      // how many outcomes are there altogether   (tier 1)
  | "complete"  // fill the gap in a table                  (tier 2)
  | "phrase"    // how many match a phrase in words         (tier 3)
  | "three";    // three stages                             (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["size"],
  2: ["complete", "size"],
  3: ["phrase", "complete"],
  4: ["three", "phrase"],
};

const DEVICES = [
  { name: "DICE", face: (i: number) => String(i + 1), sizes: [4, 6] },
  { name: "COIN", face: (i: number) => (i === 0 ? "H" : "T"), sizes: [2] },
  { name: "THREAT WHEEL", face: (i: number) => String(i + 1), sizes: [3, 4, 5, 6] },
  { name: "LOADOUT", face: (i: number) => ["AIM-9", "AIM-120", "GBU-12", "GUN"][i]!, sizes: [2, 3, 4] },
  { name: "TANK", face: (i: number) => ["FULL", "HALF", "LOW"][i]!, sizes: [2, 3] },
  { name: "SECTOR", face: (i: number) => String(i + 1), sizes: [2, 3, 4, 5, 6] },
  { name: "RUNWAY", face: (i: number) => ["09L", "09R", "27L", "27R"][i]!, sizes: [2, 3, 4] },
  { name: "TARGET", face: (i: number) => ["ALPHA", "BRAVO", "CHARLIE", "DELTA"][i]!, sizes: [2, 3, 4] },
  { name: "BAND", face: (i: number) => ["HIGH", "MID", "LOW"][i]!, sizes: [2, 3] },
] as const;

/**
 * The phrases the registry names, counted over a PAIR OF MATCHING NUMBERED
 * devices. "Doubles" and "at least one 3" are only meaningful when both devices
 * can show the same faces: asking how many outcomes of a die and a coin are
 * doubles is a question with no answer, so the phrase variant always rolls two
 * of the same thing.
 */
const PHRASES = [
  { text: (_n: number, _k: number) => "DOUBLES (the same on both)", count: (n: number) => n },
  { text: (_n: number, k: number) => `AT LEAST ONE ${k}`, count: (n: number) => 2 * n - 1 },
  { text: (_n: number, k: number) => `EXACTLY ONE ${k}`, count: (n: number) => 2 * (n - 1) },
  { text: (_n: number, _k: number) => "NOT THE SAME ON BOTH", count: (n: number) => n * n - n },
] as const;

/**
 * Some draws cannot be used: two squadrons with the same spread have no "more
 * consistent" answer, and a set the search could not build would carry a MAD
 * the card then lies about. Those are retried on a salted stream rather than by
 * calling generate() again with a different seed — a Problem must report the
 * seed it was ASKED for, and a re-seeded recursion reported the salted one.
 */
export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  return build(tier, seed, opts, 0);
}

const RETRY_SALT = 3313;
const MAX_RETRIES = 8;

function build(tier: Tier, seed: number, opts: GenerateOpts, attempt: number): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed + attempt * RETRY_SALT}`));
  const variant = opts.transfer && tier === 4 ? "three" : pick(rng, VARIANTS[tier]);

  // --- 1. build the devices ---------------------------------------------
  const wanted = variant === "three" ? 3 : 2;
  const devices: { name: string; faces: string[] }[] = [];

  if (variant === "phrase") {
    const numbered = pick(rng, ["DICE", "THREAT WHEEL"] as const);
    const size = pick(rng, numbered === "DICE" ? [4, 6] : [3, 4, 5, 6]);
    const faces = Array.from({ length: size }, (_, i) => String(i + 1));
    devices.push({ name: `${numbered} A`, faces }, { name: `${numbered} B`, faces });
  } else {
    let guard = 0;
    while (devices.length < wanted && guard++ < 200) {
      const d = pick(rng, [...DEVICES]);
      const size = pick(rng, [...d.sizes]);
      // The registry caps the whole sample space at 36.
      const soFar = devices.reduce((a, x) => a * x.faces.length, 1) * size;
      if (soFar * 2 ** (wanted - devices.length - 1) > 36) continue;
      const seenBefore = devices.filter((x) => x.name.startsWith(d.name)).length;
      // Only label a device when there are two of the same kind to tell apart.
      const name = seenBefore === 0 ? d.name : `${d.name} ${String.fromCharCode(65 + seenBefore)}`;
      if (seenBefore === 1) devices[devices.findIndex((x) => x.name === d.name)]!.name = `${d.name} A`;
      devices.push({ name, faces: Array.from({ length: size }, (_, i) => d.face(i)) });
    }
    if (devices.length < wanted) {
      if (attempt < MAX_RETRIES) return build(tier, seed, opts, attempt + 1);
      while (devices.length < wanted) devices.push({ name: "COIN", faces: ["H", "T"] });
    }
  }

  const sizes = devices.map((d) => d.faces.length);
  const total = sizes.reduce((a, b) => a * b, 1);

  const phrase = pick(rng, [...PHRASES]);
  const faceCount = sizes[0]!;
  const namedFace = int(rng, 1, faceCount);
  const phraseText = phrase.text(faceCount, namedFace);
  const matching = phrase.count(faceCount);

  // The table's missing cell: tier 2 asks for a row, a column or the grand total.
  const askRow = rng() < 0.5;
  const rowTotal = sizes[1]!;
  const missing = askRow ? rowTotal : total;

  const correct = rat(variant === "phrase" ? matching : variant === "complete" ? missing : total);

  const listed = devices.map((d) => `${d.name} (${d.faces.join(", ")})`).join("; ");

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "size"
      ? bind("Two devices are read together: {{listed}}. How many outcomes are in the whole sample space?", { listed })
      : variant === "complete"
        ? askRow
          ? bind("The outcome table for {{listed}} has one row per {{first}} face. How many cells are in ONE row?", {
              listed, first: devices[0]!.name,
            })
          : bind("The outcome table for {{listed}} is {{r}} rows by {{c}} columns. How many cells altogether?", {
              listed, r: String(sizes[0]), c: String(sizes[1]),
            })
        : variant === "phrase"
          ? bind("{{listed}}. How many of the outcomes are {{phrase}}?", { listed, phrase: phraseText })
          : bind("Three devices now: {{listed}}. How many outcomes are in the whole sample space?", { listed });

  const prompt = {
    text,
    figure: variant === "phrase" || variant === "complete"
      ? {
          kind: "outcome-table" as const,
          rows: [
            ["", ...devices[1]!.faces],
            ...devices[0]!.faces.map((f) => [f, ...devices[1]!.faces.map((g) => `${f}${g}`)]),
          ],
        }
      : { kind: "tree-diagram" as const, stages: devices.map((d) => [...d.faces]), labels: devices.map((d) => d.name) },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Build the sample space in an organised way: a table for two devices, a tree for three. Organised means you can see nothing is missing.", math: `${sizes.join(" × ")} grid` },
    { text: "Count the outcomes by MULTIPLYING the sizes. Adding them counts one row, not the whole table.", math: `${sizes.join(" × ")} = ${total}` },
    { text: "Order matters. (1, 2) and (2, 1) are two different outcomes, and the table has a cell for each.", math: "(1, 2) ≠ (2, 1)" },
    { text: "Read the phrase carefully. 'At least one' includes the case where both happen; 'exactly one' does not.", math: `${phraseText} → ${matching}` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  const added = sizes.reduce((a, b) => a + b, 0);
  const candidates: Candidate[] = [
    // order-ignored: counts (1,2) and (2,1) as one outcome
    { tag: "order-ignored", value: rat(Math.ceil(correct.n / 2)) },
    // phrase-misread: 'at least one' counted as 'exactly one' and the reverse
    { tag: "phrase-misread", value: rat(PHRASES[2]!.count(faceCount)), when: variant === "phrase" },
    { tag: "phrase-misread", value: rat(PHRASES[1]!.count(faceCount)), when: variant === "phrase" },
    { tag: "phrase-misread", value: rat(PHRASES[0]!.count(faceCount)), when: variant === "phrase" },
    // counting the stages instead of the leaves
    { tag: "order-ignored", value: rat(added) },
    { tag: "phrase-misread", value: rat(total), when: variant !== "size" && variant !== "three" },
    { tag: "phrase-misread", value: rat(sizes[0]!), when: true },
  ];

  const fmt = (v: Answer): string => fmtInt((v as { n: number }).n);
  const choice = buildChoice(rng, correct, candidates, fmt);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${devices.map((d) => `${d.name}:${d.faces.join("/")}`).join("|")}|${variant === "phrase" ? phraseText : askRow}`),
    format: rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: correct,
    answerText: fmtInt(correct.n),
    accept: acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, devices: devices.map((d) => d.name).join(","), total },
  };
}
