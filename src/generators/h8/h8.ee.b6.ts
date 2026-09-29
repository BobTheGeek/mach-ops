// h8.ee.b6 — Derive y = mx + b (Grade 8 honors, attached to Chapter 5)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, add, sub, mul, div0, fmtInt } from "../../engine/rational";
import { showNumber } from "../../engine/geometry";
import { buildChoice, acceptRational, acceptOrder, bind, type Candidate } from "../shared";

const SKILL = "h8.ee.b6";

type Variant =
  | "slope"    // the slope between two points               (tier 1)
  | "read"     // m and b off a graph, then the equation      (tier 2)
  | "build"    // drag a line through two given points        (tier 3)
  | "context"; // what m and b mean in a real situation        (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["slope"],
  2: ["read", "slope"],
  3: ["build", "read"],
  4: ["context", "build"],
};

const SKINS = {
  fuel: { y: "fuel", unit: "L", x: "minute", down: true },
  altitude: { y: "altitude", unit: "hundred ft", x: "minute", down: true },
  credits: { y: "credits", unit: "CR", x: "mission", down: false },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "context" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the line -------------------------------------------------------
  // The registry's ranges. m and b are kept whole and small so the line the
  // player drags passes through lattice points they can actually hit.
  const m = rat(pick(rng, [-4, -3, -2, -1, 1, 2, 3, 4]));
  const b = rat(int(rng, -8, 8));

  const yAt = (x: number): Rational => add(mul(m, rat(x)), b);
  // Both points have to be ON the grid the player drags the line across: a
  // target at (−3, −14) is a point they cannot reach, and with a slope of 4 and
  // an intercept of −8 that is exactly what a free x range produces.
  const onGrid = (x: number): boolean => Math.abs(yAt(x).n / yAt(x).d) <= 9 && Math.abs(x) <= 9;
  const room = [-9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(onGrid);
  const x1 = room.length ? room[int(rng, 0, Math.max(0, room.length - 2))]! : 0;
  const after = room.filter((x) => x > x1);
  const x2 = after.length ? after[int(rng, 0, after.length - 1)]! : x1 + 1;
  const y1 = yAt(x1);
  const y2 = yAt(x2);

  // The context tier states a rate and a start in words instead.
  const rate = rat(int(rng, 2, 15) * (skin.down ? -1 : 1));
  const start = rat(int(rng, 20, 90) * 10);

  const correct: Answer = variant === "slope" ? m
    : variant === "build" ? [m, b]
      : variant === "context" ? rate
        : b;

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "slope"
      ? bind("A line passes through ({{x1}}, {{y1}}) and ({{x2}}, {{y2}}). What is its SLOPE?", {
          x1: fmtInt(x1), y1: showNumber(y1), x2: fmtInt(x2), y2: showNumber(y2),
        })
      : variant === "read"
        ? bind("A line has slope {{m}} and passes through ({{x1}}, {{y1}}). Where does it cross the Y-AXIS?", {
            m: showNumber(m), x1: fmtInt(x1), y1: showNumber(y1),
          })
        : variant === "build"
          ? bind("Drag the line so it passes through ({{x1}}, {{y1}}) and ({{x2}}, {{y2}}).", {
              x1: fmtInt(x1), y1: showNumber(y1), x2: fmtInt(x2), y2: showNumber(y2),
            })
          : bind("The model for {{y}} is y = {{m}}x + {{b}}, with x in {{x}}s and y in {{unit}}. What does the {{m}} mean?", {
              y: skin.y, m: showNumber(rate),
              b: showNumber(start), x: skin.x, unit: skin.unit,
            });

  const prompt = {
    text,
    figure: {
      kind: (variant === "build" ? "coordinate-plane" : "slope-triangle") as "coordinate-plane" | "slope-triangle",
      max: 10,
      maxY: 10,
      series: variant === "build" ? [] : [[[x1, y1.n / y1.d], [x2, y2.n / y2.d]]],
      labels: ["X", "Y"],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Slope is RISE over RUN: the change in y divided by the change in x, in that order. Upside down gives a different line.", math: `(${showNumber(y2)} − ${showNumber(y1)}) ÷ (${fmtInt(x2)} − ${fmtInt(x1)}) = ${showNumber(m)}` },
    { text: "The slope is the same between ANY two points on the line. That is why one pair is enough.", math: `m = ${showNumber(m)}` },
    { text: "b is where the line crosses the Y-axis, not the x-axis. Work it out from a point you have: b = y − mx.", math: `${showNumber(y1)} − ${showNumber(m)} × ${fmtInt(x1)} = ${showNumber(b)}` },
    { text: "Watch the sign. A line falling left to right has a NEGATIVE slope, however the numbers came out.", math: `y = ${showNumber(m)}x ${b.n < 0 ? "−" : "+"} ${fmtInt(Math.abs(b.n))}` },
  ];

  const hash = sha1(`${SKILL}|${tier}|${variant}|${m.n}|${b.n}|${x1},${x2}|${variant === "context" ? `${rate.n},${start.n}` : ""}`);

  // --- 4. the drag-a-line tier ------------------------------------------
  if (variant === "build") {
    const accept = acceptOrder([m, b]);
    // A slope of 1 is its own reciprocal and an intercept of 0 its own negative,
    // so every hand-built line is passed through accept() first.
    const wrong = ([
      { tag: "run-over-rise", value: [div0(rat(1), m), b] as Answer },
      { tag: "sign-of-slope", value: [mul(m, rat(-1)), b] as Answer },
      { tag: "b-as-x-intercept", value: [m, mul(b, rat(-1))] as Answer },
    ]).filter((d) => !accept(d.value));
    return {
      skill: SKILL, tier, seed, hash,
      format: "drag-line",
      prompt,
      answer: [m, b],
      answerText: `y = ${showNumber(m)}x ${b.n < 0 ? "−" : "+"} ${fmtInt(Math.abs(b.n))}`,
      accept,
      distractors: wrong,
      errorTagsByAnswer: Object.fromEntries(wrong.map((d) => {
        const [wm, wb] = d.value as [Rational, Rational];
        return [`y = ${showNumber(wm)}x ${wb.n < 0 ? "−" : "+"} ${fmtInt(Math.abs(wb.n))}`, d.tag];
      })),
      worked,
      params: { variant, skin: skinKey, m: m.n, b: b.n },
    };
  }

  // --- 5. the context tier answers in words ------------------------------
  if (variant === "context") {
    const right = `${skin.y.toUpperCase()} CHANGES BY ${showNumber(rate)} ${skin.unit.toUpperCase()} EVERY ${skin.x.toUpperCase()}`;
    const candidates: Candidate[] = [
      { tag: "b-as-x-intercept", value: `${skin.y.toUpperCase()} STARTS AT ${showNumber(rate)} ${skin.unit.toUpperCase()}` },
      { tag: "sign-of-slope", value: `${skin.y.toUpperCase()} CHANGES BY ${showNumber(mul(rate, rat(-1)))} ${skin.unit.toUpperCase()} EVERY ${skin.x.toUpperCase()}` },
      { tag: "run-over-rise", value: `${skin.y.toUpperCase()} CHANGES BY ${showNumber(start)} ${skin.unit.toUpperCase()} EVERY ${skin.x.toUpperCase()}` },
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
      params: { variant, skin: skinKey, m: rate.n, b: start.n },
    };
  }

  // --- 6. distractors from registry error tags --------------------------
  const target = correct as Rational;
  const candidates: Candidate[] = [
    // run-over-rise: run divided by rise
    { tag: "run-over-rise", value: () => div0(rat(1), target), when: target.n !== 0 },
    // sign-of-slope: the right size, the wrong direction
    { tag: "sign-of-slope", value: mul(target, rat(-1)), when: target.n !== 0 },
    // b-as-x-intercept: b read off the x-axis instead
    { tag: "b-as-x-intercept", value: () => div0(mul(b, rat(-1)), m), when: variant === "read" && m.n !== 0 },
    { tag: "b-as-x-intercept", value: sub(rat(0), target) },
  ];
  const choice = buildChoice(rng, target, candidates, (v: Answer) => showNumber(v as Rational));

  return {
    skill: SKILL, tier, seed, hash,
    format: rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: target,
    answerText: showNumber(target),
    accept: acceptRational(target),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, m: m.n, b: b.n },
  };
}
