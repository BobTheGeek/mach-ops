// h8.g.a2 — Parallel lines cut by a transversal (Grade 8 honors, attached to Chapter 9)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat } from "../../engine/rational";
import { supplement, partnerAngle, showNumber, EQUAL_PAIRS, type AnglePair } from "../../engine/geometry";
import { buildChoice, acceptRational, bind, type Candidate } from "../shared";

const SKILL = "h8.g.a2";

type Variant =
  | "name"      // what is this pair called                 (tier 1)
  | "find"      // one angle given, find its partner         (tier 2)
  | "equation"  // two expressions, solve for the angle      (tier 3)
  | "chain";    // two steps across the figure               (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["name"],
  2: ["find", "name"],
  3: ["equation", "find"],
  4: ["chain", "equation"],
};

const PAIRS: AnglePair[] = [
  "CORRESPONDING", "ALTERNATE INTERIOR", "ALTERNATE EXTERIOR", "SAME-SIDE INTERIOR",
];

/** "An alternate interior pair", "A corresponding pair". */
const article = (p: AnglePair): string =>
  `${/^[AEIOU]/.test(p) ? "An" : "A"} ${p.toLowerCase()}`;

const SKINS = {
  runways: { noun: "two parallel runways", cut: "a taxiway" },
  formation: { noun: "two formation lines", cut: "a crossing element" },
} as const;

type SkinKey = keyof typeof SKINS;

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "chain" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. the figure -----------------------------------------------------
  // The registry's range.
  const given = rat(int(rng, 30, 150));
  // Three of the four named pairs are equal and one is supplementary. Drawing a
  // pair at random would make "the same as the angle you were given" right three
  // times in four, so the KIND is drawn first and then a pair of that kind.
  // Naming is asked about all four evenly; the value questions balance the KIND
  // instead, or "the same as the one you were given" would be right three times
  // in four.
  const balanced = rng() < 0.5;
  const pair: AnglePair = variant === "name"
    ? pick(rng, PAIRS)
    : balanced ? pick(rng, PAIRS.filter((x) => EQUAL_PAIRS.includes(x))) : "SAME-SIDE INTERIOR";
  const equal = EQUAL_PAIRS.includes(pair);
  const partner = partnerAngle(given, pair);

  // Tier 3: (mx + a) and its partner. m and a are chosen so x comes out whole.
  const m = int(rng, 2, 8);
  const x = int(rng, 5, 18);
  const a = given.n - m * x;
  const expression = `${m}x ${a < 0 ? "−" : "+"} ${Math.abs(a)}`;

  // Tier 4: two hops. The partner's neighbour on the straight line is its
  // supplement, so the answer is the OTHER of the figure's two values —
  // whichever way round the first hop went.
  const chained = supplement(partner);

  const correct: Rational =
    variant === "equation" ? given
      : variant === "chain" ? chained
        : partner;

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "name"
      ? bind("{{noun}} are crossed by {{cut}}. Angle 1 is {{a}}° and angle {{n}} sits {{where}}. What is that PAIR called?", {
          noun: `${skin.noun.charAt(0).toUpperCase()}${skin.noun.slice(1)}`, cut: skin.cut,
          a: showNumber(given), n: equal ? "5" : "4",
          where: pair === "CORRESPONDING" ? "in the matching position at the other crossing"
            : pair === "ALTERNATE INTERIOR" ? "on the other side of the taxiway, between the two lines"
              : pair === "ALTERNATE EXTERIOR" ? "on the other side of the taxiway, outside both lines"
                : "on the same side of the taxiway, between the two lines",
        })
      : variant === "find"
        ? bind("{{noun}} are crossed by {{cut}}. One angle is {{a}}°. What is its {{pair}} partner?", {
            noun: `${skin.noun.charAt(0).toUpperCase()}${skin.noun.slice(1)}`, cut: skin.cut,
            a: showNumber(given), pair: pair,
          })
        : variant === "equation"
          ? bind("{{noun}} are crossed by {{cut}}. {{pair}} pair measures ({{e}})° and {{p}}°. What is the FIRST angle?", {
              noun: `${skin.noun.charAt(0).toUpperCase()}${skin.noun.slice(1)}`, cut: skin.cut,
              pair: article(pair), e: expression, p: showNumber(partner),
            })
          : bind("{{noun}} are crossed by {{cut}}. One angle is {{a}}°. Its {{pair}} partner sits on a straight line next to one more angle. What is THAT one?", {
              noun: `${skin.noun.charAt(0).toUpperCase()}${skin.noun.slice(1)}`, cut: skin.cut,
              a: showNumber(given), pair: pair.toLowerCase(),
            });

  const prompt = {
    text,
    units: "degrees",
    figure: {
      kind: "transversal-diagram" as const,
      labels: variant === "name"
        ? ["1", "2", "3", "4", "5", "6", "7", "8"]
        : [`${showNumber(given)}°`, "", "", "", equal ? "?" : "", equal ? "" : "?", "", ""],
    },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Find the two crossings. Every angle at the first has a twin at the second, in the same position.", math: "two crossings, eight angles" },
    { text: "CORRESPONDING, ALTERNATE INTERIOR and ALTERNATE EXTERIOR pairs are EQUAL. So are vertical angles.", math: `${EQUAL_PAIRS.join(", ")} → equal` },
    { text: "SAME-SIDE INTERIOR angles — both between the lines, both on the same side of the crossing line — add to 180.", math: "same-side interior → 180°" },
    { text: "Name the pair first, then write the equation it gives you: equal, or adding to 180.", math: `${showNumber(given)}° → ${showNumber(partner)}°` },
  ];

  const hash = sha1(`${SKILL}|${tier}|${variant}|${given.n}|${pair}|${variant === "equation" ? `${m},${x}` : ""}`);

  // --- 4. naming the pair answers in words ------------------------------
  if (variant === "name") {
    const candidates: Candidate[] = [
      // pair-name: alternate and corresponding confused
      { tag: "pair-name", value: pair === "CORRESPONDING" ? "ALTERNATE INTERIOR" : "CORRESPONDING" },
      { tag: "all-equal", value: "SAME-SIDE INTERIOR" },
      { tag: "pair-name", value: "ALTERNATE EXTERIOR" },
      { tag: "all-equal", value: "VERTICAL" },
    ];
    const choice = buildChoice(rng, pair, candidates, (v: Answer) => String(v));
    return {
      skill: SKILL, tier, seed, hash,
      format: "multiple-choice",
      prompt,
      answer: pair,
      answerText: pair,
      accept: (input: Answer) => String(input).toUpperCase() === pair,
      distractors: choice.distractors,
      options: choice.options,
      optionText: choice.optionText,
      correctIndex: choice.correctIndex,
      worked,
      errorTagsByAnswer: choice.errorTagsByAnswer,
      params: { variant, skin: skinKey, given: given.n, pair },
    };
  }

  // --- 5. distractors from registry error tags --------------------------
  //
  // A transversal figure contains exactly TWO angle values: the one you were
  // given and its supplement. Any third number on the card is not an angle in
  // the picture at all, so these questions are asked as a choice between the two
  // — except the equation variant, where x is a real thing to be caught
  // answering with.
  const other = supplement(correct);
  const candidates: Candidate[] = [
    // all-equal: every pair read as equal, so the supplementary one is missed
    { tag: "all-equal", value: other },
    // stopping at x rather than the angle it produces
    { tag: "pair-name", value: rat(x), when: variant === "equation" },
  ];

  const choice = buildChoice(
    rng, correct, candidates, (v: Answer) => `${showNumber(v as Rational)}°`,
    variant === "equation" ? 3 : 2,
  );

  return {
    skill: SKILL, tier, seed, hash,
    format: rng() < 0.5 ? "numeric" : "multiple-choice",
    prompt,
    answer: correct,
    answerText: `${showNumber(correct)}°`,
    accept: acceptRational(correct),
    distractors: choice.distractors,
    options: choice.options,
    optionText: choice.optionText,
    correctIndex: choice.correctIndex,
    worked,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    params: { variant, skin: skinKey, given: given.n, pair },
  };
}
