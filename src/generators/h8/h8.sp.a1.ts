// h8.sp.a1 — Scatter plots and two-way tables (Grade 8 honors, attached to Chapter 8)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, mul, div0, fmtInt, fmtDecimal, isTerminating, fmtFraction } from "../../engine/rational";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "h8.sp.a1";

type Variant =
  | "association"  // which way do the points trend        (tier 1)
  | "outlier"      // which point does not belong          (tier 2)
  | "table"        // fill the gap in a two-way table      (tier 3)
  | "relative";    // a row or column share as a percent   (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["association"],
  2: ["outlier", "association"],
  3: ["table", "outlier"],
  4: ["relative", "table"],
};

const TRACKS = {
  altitude: { x: "ALTITUDE (1,000 FT)", y: "SPEED (KT)" },
  payload: { x: "PAYLOAD (100 KG)", y: "FUEL BURN (L/MIN)" },
  hours: { x: "PILOT HOURS (100S)", y: "LOCK TIME (S)" },
} as const;

type TrackKey = keyof typeof TRACKS;

const TABLES = {
  faults: { rows: ["F-16", "F-15"], cols: ["ENGINE", "AVIONICS", "HYDRAULICS"], what: "faults by aircraft type" },
  sorties: { rows: ["DAY", "NIGHT"], cols: ["CLEAN", "MINOR", "MAJOR"], what: "sorties by shift and write-up" },
} as const;

type TableKey = keyof typeof TABLES;

const show = (r: Rational): string =>
  (r.d === 1 ? fmtInt(r.n) : isTerminating(r) ? fmtDecimal(r) : fmtFraction(r));

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "relative" : pick(rng, VARIANTS[tier]);
  const trackKey = (opts.skin as TrackKey | undefined) ?? pick(rng, Object.keys(TRACKS) as TrackKey[]);
  const track = TRACKS[trackKey];
  const tableKey = pick(rng, Object.keys(TABLES) as TableKey[]);
  const table = TABLES[tableKey];

  // --- 1. a point cloud with a known trend ------------------------------
  // Positive, negative or none, drawn evenly: a cloud that always trends one way
  // teaches the word, not the reading.
  const direction = pick(rng, ["POSITIVE", "NEGATIVE", "NONE"] as const);
  const slope = direction === "POSITIVE" ? int(rng, 2, 5) : direction === "NEGATIVE" ? -int(rng, 2, 5) : 0;
  const base = int(rng, 20, 40);
  const count = int(rng, 8, 12);
  // No-association clouds need noise wide enough to swamp any accidental trend.
  const noise = direction === "NONE" ? 20 : 3;

  const points = Array.from({ length: count }, (_, i) => {
    const x = i + 1;
    const y = base + slope * x + int(rng, -noise, noise);
    return [x, Math.max(1, y)] as [number, number];
  });

  // Tier 2 drops one point a long way off the trend.
  const oddAt = int(rng, 1, count - 2);
  const oddPoint: [number, number] = [points[oddAt]![0], points[oddAt]![1] + int(rng, 40, 70)];
  const cloud = variant === "outlier"
    ? points.map((p, i) => (i === oddAt ? oddPoint : p))
    : points;

  // --- 2. the two-way table ---------------------------------------------
  // Every row totals 200 and every cell is a multiple of ten, so a row share is
  // a whole percent. Left to chance, "what percent were MAJOR" came out as
  // 19 1/21%, which is arithmetic nobody does in their head about sortie logs.
  const ROW_TOTAL = 200;
  const cells = table.rows.map(() => {
    const parts: number[] = [];
    let left = ROW_TOTAL;
    for (let c = 0; c < table.cols.length - 1; c++) {
      const remaining = table.cols.length - c - 1;
      const take = int(rng, 1, Math.max(1, Math.floor(left / 10) - remaining)) * 10;
      parts.push(take);
      left -= take;
    }
    parts.push(left);
    return parts;
  });
  const rowTotals = cells.map((r) => r.reduce((a, b) => a + b, 0));
  const colTotals = table.cols.map((_, c) => cells.reduce((a, r) => a + r[c]!, 0));
  const grand = rowTotals.reduce((a, b) => a + b, 0);

  const missingRow = int(rng, 0, table.rows.length - 1);
  const missingCol = int(rng, 0, table.cols.length - 1);
  const missingValue = cells[missingRow]![missingCol]!;
  const shareRow = int(rng, 0, table.rows.length - 1);
  const shareCol = int(rng, 0, table.cols.length - 1);
  const shareCount = cells[shareRow]![shareCol]!;
  const sharePercent = mul(div0(rat(shareCount), rat(rowTotals[shareRow]!)), rat(100));

  const correct: Rational = variant === "table" ? rat(missingValue) : sharePercent;

  // --- 3. prompt --------------------------------------------------------
  const cellText = (r: number, c: number): string =>
    (variant === "table" && r === missingRow && c === missingCol ? "?" : fmtInt(cells[r]![c]!));

  const tableRows = [
    ["", ...table.cols, "TOTAL"],
    ...table.rows.map((name, r) => [name, ...table.cols.map((_, c) => cellText(r, c)), fmtInt(rowTotals[r]!)]),
    ["TOTAL", ...colTotals.map((t) => fmtInt(t)), fmtInt(grand)],
  ];

  const text =
    variant === "association"
      ? bind("This scatter plot tracks {{y}} against {{x}}. What association does it show?", { y: track.y, x: track.x })
      : variant === "outlier"
        ? bind("One track on this plot of {{y}} against {{x}} does not fit the pattern. Which point is it?", { y: track.y, x: track.x })
        : variant === "table"
          ? bind("This two-way table of {{what}} is missing one cell. The row and column totals are given. What goes in the gap?", { what: table.what })
          : bind("Of the {{row}} {{what}}, what PERCENT were {{col}}?", {
              row: table.rows[shareRow]!, what: table.what.split(" by ")[0]!, col: table.cols[shareCol]!,
            });

  const prompt = {
    text,
    units: variant === "relative" ? "%" : undefined,
    figure: variant === "association" || variant === "outlier"
      ? {
          kind: "scatter-plot" as const,
          series: [cloud.map((p) => [p[0], p[1]])],
          max: count + 1,
          maxY: Math.ceil(Math.max(...cloud.map((p) => p[1])) / 10) * 10,
          labels: [track.x, track.y],
        }
      : { kind: "two-way-table" as const, rows: tableRows },
  };

  // --- 4. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "On a scatter plot, read left to right. Points that climb are a POSITIVE association; points that fall are NEGATIVE; a shapeless cloud is NONE.", math: direction },
    { text: "Look for points sitting away from the crowd. One of those is an outlier; a group of them is a cluster.", math: variant === "outlier" ? `(${oddPoint[0]}, ${oddPoint[1]})` : "no outliers" },
    { text: "In a two-way table every row adds to its row total and every column to its column total. A missing cell is whichever total minus the cells you can see.", math: `${fmtInt(rowTotals[missingRow]!)} − the rest = ${fmtInt(missingValue)}` },
    { text: "A relative frequency is a SHARE, not a count: divide the cell by its row or column total, then multiply by 100.", math: `${fmtInt(shareCount)}/${fmtInt(rowTotals[shareRow]!)} × 100 = ${show(sharePercent)}%` },
  ];

  const hash = sha1(`${SKILL}|${tier}|${variant}|${direction}|${cloud.map((p) => p.join(":")).join(",")}|${cells.flat().join(",")}|${missingRow}:${missingCol}|${shareRow}:${shareCol}`);

  // --- 5. the association reads as a word -------------------------------
  if (variant === "association") {
    const OPPOSITE: Record<string, string> = { POSITIVE: "NEGATIVE", NEGATIVE: "POSITIVE", NONE: "POSITIVE" };
    const candidates: Candidate[] = [
      // association-direction: up and down read the wrong way round
      { tag: "association-direction", value: OPPOSITE[direction]! },
      { tag: "frequency-vs-relative", value: "NONE" },
      { tag: "association-direction", value: "NEGATIVE" },
      { tag: "frequency-vs-relative", value: "POSITIVE" },
    ];
    const choice = buildChoice(rng, direction, candidates, (a: Answer) => String(a), 3);
    return {
      skill: SKILL, tier, seed, hash,
      format: "multiple-choice",
      prompt,
      answer: direction,
      answerText: direction,
      accept: (input: Answer) => String(input).toUpperCase() === direction,
      distractors: choice.distractors,
      options: choice.options,
      optionText: choice.optionText,
      correctIndex: choice.correctIndex,
      worked,
      errorTagsByAnswer: choice.errorTagsByAnswer,
      params: { variant, skin: trackKey, direction },
    };
  }

  // --- 6. the outlier is named by its coordinates ------------------------
  if (variant === "outlier") {
    const right = `(${oddPoint[0]}, ${oddPoint[1]})`;
    const others = cloud.filter((_, i) => i !== oddAt);
    const candidates: Candidate[] = [
      { tag: "association-direction", value: `(${others[0]![0]}, ${others[0]![1]})` },
      { tag: "frequency-vs-relative", value: `(${oddPoint[1]}, ${oddPoint[0]})` },
      { tag: "association-direction", value: `(${others[others.length - 1]![0]}, ${others[others.length - 1]![1]})` },
    ];
    const choice = buildChoice(rng, right, candidates, (a: Answer) => String(a));
    return {
      skill: SKILL, tier, seed, hash,
      format: "multiple-choice",
      prompt,
      answer: right,
      answerText: right,
      accept: (input: Answer) => String(input).replace(/\s+/g, "") === right.replace(/\s+/g, ""),
      distractors: choice.distractors,
      options: choice.options,
      optionText: choice.optionText,
      correctIndex: choice.correctIndex,
      worked,
      errorTagsByAnswer: choice.errorTagsByAnswer,
      params: { variant, skin: trackKey, direction },
    };
  }

  // --- 7. distractors from registry error tags --------------------------
  const candidates: Candidate[] = [
    // frequency-vs-relative: a count given where a share was asked for, and back
    { tag: "frequency-vs-relative", value: variant === "relative" ? rat(shareCount) : sharePercent },
    { tag: "frequency-vs-relative", value: () => mul(div0(rat(shareCount), rat(grand)), rat(100)), when: variant === "relative" },
    // association-direction: the share of everything EXCEPT the named column,
    // which is what reading the wrong part of the row gives you. Taking it
    // against the column total instead produced sevenths, and an option nobody
    // would ever write down is not a distractor.
    { tag: "association-direction", value: () => mul(div0(rat(rowTotals[shareRow]! - shareCount), rat(rowTotals[shareRow]!)), rat(100)), when: variant === "relative" },
    { tag: "association-direction", value: rat(rowTotals[missingRow]! - missingValue), when: variant === "table" },
    { tag: "frequency-vs-relative", value: rat(colTotals[missingCol]!), when: variant === "table" },
  ];

  const fmt = (v: Answer): string => (variant === "relative" ? `${show(v as Rational)}%` : show(v as Rational));
  const choice = buildChoice(rng, correct, candidates, fmt);

  return {
    skill: SKILL, tier, seed, hash,
    format: rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: correct,
    answerText: variant === "relative" ? `${show(correct)}%` : show(correct),
    accept: acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: trackKey, direction, table: tableKey },
  };
}
