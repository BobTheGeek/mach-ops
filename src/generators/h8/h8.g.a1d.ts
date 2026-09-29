// h8.g.a1d — Dilations and scale factors (Grade 8 honors, attached to Chapter 5)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, add, mul, div0, fmtInt } from "../../engine/rational";
import { showNumber } from "../../engine/geometry";
import { buildChoice, acceptRational, acceptOrder, bind, type Candidate } from "../shared";

const SKILL = "h8.g.a1d";

type Variant =
  | "factor"   // k from two matching lengths              (tier 1)
  | "point"    // dilate one point from the origin          (tier 2)
  | "figure"   // what happens to perimeter and to area      (tier 3)
  | "read";    // find the centre and k from a picture       (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["factor"],
  2: ["point", "factor"],
  3: ["figure", "point"],
  4: ["read", "figure"],
};

/** The registry's scale factors. */
const FACTORS: [number, number][] = [[1, 2], [1, 3], [2, 1], [3, 1], [3, 2]];

const SKINS = {
  model: { thing: "the scale model", full: "the full airframe", unit: "cm" },
  map: { thing: "the zoomed tactical map", full: "the original map", unit: "px" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "read" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the dilation ---------------------------------------------------
  const f = pick(rng, FACTORS);
  const k = rat(f[0], f[1]);

  // A point whose image lands on the grid: x and y are multiples of the
  // factor's denominator so kx and ky stay whole.
  const px = int(rng, -4, 4) * f[1];
  const py = int(rng, -4, 4) * f[1];
  const image: Answer = [mul(k, rat(px)), mul(k, rat(py))];

  // Two matching lengths, for reading k off.
  const original = int(rng, 2, 9) * f[1];
  const dilated = mul(k, rat(original));

  // A figure, for the perimeter-and-area tier.
  const side = int(rng, 2, 8);
  const perimeter = mul(rat(side * 4), k);
  const area = mul(rat(side * side), mul(k, k));
  const asksArea = rng() < 0.5;

  const correct: Answer =
    variant === "point" ? image
      : variant === "factor" || variant === "read" ? k
        : asksArea ? area : perimeter;

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "factor"
      ? bind("{{full}} measures {{o}} {{unit}} where {{thing}} measures {{d}} {{unit}}. What is the SCALE FACTOR from the first to the second?", {
          full: `${skin.full.charAt(0).toUpperCase()}${skin.full.slice(1)}`, o: fmtInt(original),
          unit: skin.unit, thing: skin.thing, d: showNumber(dilated),
        })
      : variant === "point"
        ? bind("Dilate ({{x}}, {{y}}) from the ORIGIN by a scale factor of {{k}}. Put a point where it lands.", {
            x: fmtInt(px), y: fmtInt(py), k: showNumber(k),
          })
        : variant === "figure"
          ? bind("A square of side {{s}} {{unit}} is dilated by a scale factor of {{k}}. What is its new {{what}}?", {
              s: fmtInt(side), unit: skin.unit, k: showNumber(k), what: asksArea ? "AREA" : "PERIMETER",
            })
          : bind("Every distance from the origin has been multiplied by the same number: ({{x}}, {{y}}) has become ({{ix}}, {{iy}}). What is the scale factor?", {
              x: fmtInt(px), y: fmtInt(py),
              ix: showNumber((image as Rational[])[0]!), iy: showNumber((image as Rational[])[1]!),
            });

  const prompt = {
    text,
    units: variant === "figure" ? (asksArea ? `${skin.unit}²` : skin.unit) : undefined,
    figure: variant === "point"
      ? { kind: "coordinate-plane" as const, max: 10, labels: ["X", "Y"] }
      : { kind: "dilation-pair" as const, rows: [["ORIGINAL", fmtInt(original)], ["IMAGE", showNumber(dilated)]] },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "A dilation MULTIPLIES every distance from the centre by the same number k. It does not add anything.", math: `k = ${showNumber(k)}` },
    { text: "From the origin, (x, y) goes to (kx, ky). Multiply BOTH coordinates.", math: `(${fmtInt(px)}, ${fmtInt(py)}) → (${showNumber((image as Rational[])[0]!)}, ${showNumber((image as Rational[])[1]!)})` },
    { text: "k bigger than 1 enlarges; k between 0 and 1 shrinks. To find k, divide an image length by its original.", math: `${showNumber(dilated)} ÷ ${fmtInt(original)} = ${showNumber(k)}` },
    { text: "Every LENGTH scales by k, so the perimeter does too — but AREA scales by k SQUARED, because both sides grow.", math: `perimeter × ${showNumber(k)}, area × ${showNumber(mul(k, k))}` },
  ];

  const hash = sha1(`${SKILL}|${tier}|${variant}|${k.n}/${k.d}|${px},${py}|${original}|${side}|${asksArea}`);

  // --- 4. the plot-a-point tier -----------------------------------------
  if (variant === "point") {
    const [ix, iy] = image as [Rational, Rational];
    const accept = acceptOrder([ix, iy]);
    // Some draws make a "wrong" image identical to the right one — (2, 2) at a
    // factor of 2 both doubles and adds to (4, 4). Every hand-built distractor
    // is passed through accept() and dropped if the card would mark it right.
    const wrong = ([
      { tag: "add-not-multiply", value: [add(rat(px), k), add(rat(py), k)] as Answer },
      { tag: "area-linear", value: [ix, rat(py)] as Answer },
      { tag: "area-linear", value: [rat(px), iy] as Answer },
    ]).filter((d) => !accept(d.value));
    return {
      skill: SKILL, tier, seed, hash,
      format: "plot-point",
      prompt,
      answer: image,
      answerText: `(${showNumber(ix)}, ${showNumber(iy)})`,
      accept,
      distractors: wrong,
      errorTagsByAnswer: Object.fromEntries(wrong.map((d) => {
        const [a, b2] = d.value as [Rational, Rational];
        return [`(${showNumber(a)}, ${showNumber(b2)})`, d.tag];
      })),
      worked,
      params: { variant, skin: skinKey, k: `${k.n}/${k.d}`, point: `${px},${py}` },
    };
  }

  // --- 5. distractors from registry error tags --------------------------
  const target = correct as Rational;
  const candidates: Candidate[] = [
    // area-linear: area scaled by k rather than by k squared
    { tag: "area-linear", value: mul(rat(side * side), k), when: variant === "figure" && asksArea },
    { tag: "area-linear", value: mul(rat(side * 4), mul(k, k)), when: variant === "figure" && !asksArea },
    { tag: "area-linear", value: mul(k, k), when: variant !== "figure" },
    // add-not-multiply: k added rather than multiplied
    { tag: "add-not-multiply", value: add(rat(side * 4), k), when: variant === "figure" },
    { tag: "add-not-multiply", value: () => div0(rat(1), target), when: variant !== "figure" && target.n !== 0 },
    { tag: "add-not-multiply", value: mul(target, rat(2)) },
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
    params: { variant, skin: skinKey, k: `${k.n}/${k.d}` },
  };
}
