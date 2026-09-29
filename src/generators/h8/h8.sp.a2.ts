// h8.sp.a2 — Line of fit (Grade 8 honors, attached to Chapter 8)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, add, mul, fmtInt } from "../../engine/rational";
import { showNumber } from "../../engine/geometry";
import { buildChoice, acceptOrder, bind, type Candidate } from "../shared";

const SKILL = "h8.sp.a2";

type Variant =
  | "choose"   // the best of three lines                   (tier 1)
  | "drag"     // drag one through the cloud                 (tier 2)
  | "judge"    // is this a strong fit or a weak one          (tier 3)
  | "outlier"; // a line pulled off by one stray point        (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["choose"],
  2: ["drag", "choose"],
  3: ["judge", "drag"],
  4: ["outlier", "judge"],
};

const SKINS = {
  lock: { x: "PILOT HOURS (100s)", y: "LOCK TIME (S)" },
  burn: { x: "PAYLOAD (100 KG)", y: "FUEL BURN (L/MIN)" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "outlier" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the cloud ------------------------------------------------------
  // A trend with noise on it. The line of fit is the trend line, and the
  // player's job is to find it through the scatter rather than to hit points.
  const m = rat(int(rng, 1, 3) * (rng() < 0.4 ? -1 : 1));
  const b = rat(int(rng, -4, 4));
  const tight = rng() < 0.5;
  const noise = tight ? 1 : 3;

  const count = int(rng, 8, 12);
  const points = Array.from({ length: count }, (_, i) => {
    const x = i - Math.floor(count / 2);
    const y = (m.n * x) / m.d + b.n / b.d + int(rng, -noise, noise);
    return [x, y] as [number, number];
  });

  // Tier 4 drops one point a long way off, and offers the line it drags a
  // careless fit towards.
  const strayAt = int(rng, 0, count - 1);
  const stray: [number, number] = [points[strayAt]![0], points[strayAt]![1] + int(rng, 8, 14)];
  const cloud = variant === "outlier" ? points.map((p, i) => (i === strayAt ? stray : p)) : points;

  const describe = (mm: Rational, bb: Rational): string =>
    `y = ${mm.n === 1 ? "x" : mm.n === -1 ? "−x" : showNumber(mm) + "x"}${bb.n === 0 ? "" : ` ${bb.n < 0 ? "−" : "+"} ${fmtInt(Math.abs(bb.n))}`}`;

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "choose"
      ? bind("Which line fits this scatter best?", {})
      : variant === "drag"
        ? bind("Drag a LINE OF FIT through the middle of these points: about as many above it as below.", {})
        : variant === "judge"
          ? bind("A line of fit is drawn through this scatter. Is it a STRONG fit or a weak one?", {})
          : bind("One reading here is a long way off the rest. Which line is the honest fit?", {});

  const prompt = {
    text,
    figure: {
      kind: (variant === "drag" ? "coordinate-plane" : "scatter-plot-with-line") as "coordinate-plane" | "scatter-plot-with-line",
      max: 10,
      maxY: 10,
      series: variant === "drag" ? [] : [cloud.map((p) => [p[0], p[1]])],
      labels: [skin.x, skin.y],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "A line of fit runs through the MIDDLE of the cloud, with about as many points above it as below.", math: describe(m, b) },
    { text: "It does not have to touch any of the points. Hitting the most points is not the same as fitting them all.", math: "balance, not contact" },
    { text: "Judge the fit by how close the points stay to the line. A tight band is a strong fit; a wide scatter is a weak one.", math: tight ? "tight — strong" : "wide — weak" },
    { text: "Ignore a single stray reading when you place the line. One outlier can drag a careless line right off the trend.", math: variant === "outlier" ? `(${stray[0]}, ${stray[1]}) is the stray` : "no stray" },
  ];

  const hash = sha1(`${SKILL}|${tier}|${variant}|${m.n},${b.n}|${tight}|${cloud.map((p) => p.join(":")).join(",")}`);

  // --- 4. the drag tier -------------------------------------------------
  if (variant === "drag") {
    const accept = acceptOrder([m, b]);
    const wrong = ([
      // through-endpoints: the first and last points joined up
      { tag: "through-endpoints", value: [add(m, rat(1)), b] as Answer },
      // through-max-points: a line that hits several points but is not balanced
      { tag: "through-max-points", value: [m, add(b, rat(3))] as Answer },
      { tag: "through-endpoints", value: [mul(m, rat(-1)), b] as Answer },
    ]).filter((d) => !accept(d.value));
    return {
      skill: SKILL, tier, seed, hash,
      format: "drag-line",
      prompt: {
        ...prompt,
        figure: { ...prompt.figure, series: [cloud.map((p) => [p[0], p[1]])] },
      },
      answer: [m, b],
      answerText: describe(m, b),
      accept,
      distractors: wrong,
      errorTagsByAnswer: Object.fromEntries(wrong.map((d) => {
        const [wm, wb] = d.value as [Rational, Rational];
        return [describe(wm, wb), d.tag];
      })),
      worked,
      params: { variant, skin: skinKey, m: m.n, b: b.n, tight: String(tight) },
    };
  }

  // --- 5. judging the fit -----------------------------------------------
  if (variant === "judge") {
    const answer = tight ? "STRONG" : "WEAK";
    const foil = tight ? "WEAK" : "STRONG";
    const options = ["STRONG", "WEAK"];
    return {
      skill: SKILL, tier, seed, hash,
      format: "multiple-choice",
      prompt,
      answer,
      answerText: answer,
      accept: (input: Answer) => String(input).toUpperCase() === answer,
      distractors: [{ tag: "through-max-points", value: foil }],
      options,
      optionText: options,
      correctIndex: options.indexOf(answer),
      worked,
      errorTagsByAnswer: { [foil]: "through-max-points" },
      params: { variant, skin: skinKey, tight: String(tight) },
    };
  }

  // --- 6. choosing a line -----------------------------------------------
  const right = describe(m, b);
  const candidates: Candidate[] = [
    // through-endpoints: the first and last points joined, which tilts it
    { tag: "through-endpoints", value: describe(add(m, rat(1)), b) },
    // through-max-points: parallel but pushed off the middle of the cloud
    { tag: "through-max-points", value: describe(m, add(b, rat(4))) },
    { tag: "through-endpoints", value: describe(mul(m, rat(-1)), b) },
  ];
  const choice = buildChoice(rng, right, candidates, (v: Answer) => String(v));

  return {
    skill: SKILL, tier, seed, hash,
    format: "multiple-choice",
    prompt,
    answer: right,
    answerText: right,
    accept: (input: Answer) => String(input) === right,
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, m: m.n, b: b.n, tight: String(tight) },
  };
}
