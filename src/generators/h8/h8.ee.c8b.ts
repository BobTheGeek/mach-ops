// h8.ee.c8b — Estimate a system's solution by graphing
// (Grade 8 honors, attached to Chapter 5)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import type { Rational } from "../../engine/rational";
import { rat, add, sub, mul, fmtInt } from "../../engine/rational";
import { showNumber } from "../../engine/geometry";
import { buildChoice, acceptOrder, bind, type Candidate } from "../shared";

const SKILL = "h8.ee.c8b";

type Variant =
  | "read"     // the crossing is drawn; read it off          (tier 1)
  | "plot"     // graph both and put a point on the crossing   (tier 2)
  | "estimate" // the crossing is not on a lattice point       (tier 3)
  | "context"; // where and when two aircraft meet             (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["read"],
  2: ["plot", "read"],
  3: ["estimate", "plot"],
  4: ["context", "estimate"],
};

const SKINS = {
  tracks: { x: "MINUTES", y: "KM NORTH", one: "the lead aircraft", two: "the wingman" },
  climb: { x: "MINUTES", y: "1,000 FT", one: "the climbing pair", two: "the descending pair" },
} as const;

type SkinKey = keyof typeof SKINS;

/** y = mx + b, written the way the card shows it. */
const fmtLine = (m: Rational, b: Rational): string => {
  // A flat line is "y = 3", not "y = 0x + 3".
  if (m.n === 0) return `y = ${fmtInt(b.n)}`;
  const coefficient = m.d === 1 && m.n === 1 ? "x"
    : m.d === 1 && m.n === -1 ? "−x"
      : m.d === 1 ? `${fmtInt(m.n)}x`
        : `(${fmtInt(m.n)}/${m.d})x`;
  if (b.n === 0) return `y = ${coefficient}`;
  return `y = ${coefficient} ${b.n < 0 ? "−" : "+"} ${fmtInt(Math.abs(b.n))}`;
};

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "context" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. build the system from its answer ------------------------------
  // The registry's method: choose the crossing FIRST, then build two lines
  // through it. Working the other way round gives a crossing at (2.37, −1.04),
  // which is not a point anyone can read off a grid.
  const span = 10;
  const px = int(rng, -4, 4);
  const py = int(rng, -6, 6);

  // b = y − m x, so a steep slope through a far-out crossing throws the
  // y-intercept off the grid: "y = 3x − 24" is not a line anyone can picture on
  // a board that stops at 10. Only slopes that keep both intercepts on it are
  // offered.
  const fits = (m: number): boolean => Math.abs(py - m * px) <= span;
  const pool = [-3, -2, -1, 1, 2, 3].filter(fits);
  const m1 = rat(pool.length ? pick(rng, pool) : 1);
  const m2pool = pool.filter((v) => v !== m1.n);
  const m2 = rat(m2pool.length ? pick(rng, m2pool) : -m1.n);
  // b = y − m x, so each line passes through the crossing exactly.
  const b1 = sub(rat(py), mul(m1, rat(px)));
  const b2 = sub(rat(py), mul(m2, rat(px)));

  const correct: Answer = [rat(px), rat(py)];

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "read"
      ? bind("Two lines are drawn: {{a}} and {{b}}. Put a point where they CROSS.", {
          a: fmtLine(m1, b1), b: fmtLine(m2, b2),
        })
      : variant === "plot"
        ? bind("Graph {{a}} and {{b}} in your head, then put a point where they cross.", {
            a: fmtLine(m1, b1), b: fmtLine(m2, b2),
          })
        : variant === "estimate"
          ? bind("{{a}} and {{b}} cross at one point. Put a point on it, then check it in BOTH equations.", {
              a: fmtLine(m1, b1), b: fmtLine(m2, b2),
            })
          : bind("{{one}} follows {{a}} and {{two}} follows {{b}}, with x in {{xu}} and y in {{yu}}. Mark where they MEET.", {
              one: `${skin.one.charAt(0).toUpperCase()}${skin.one.slice(1)}`, a: fmtLine(m1, b1),
              two: skin.two, b: fmtLine(m2, b2), xu: skin.x.toLowerCase(), yu: skin.y.toLowerCase(),
            });

  const prompt = {
    text,
    figure: { kind: "coordinate-plane-two-lines" as const, max: span, labels: [skin.x, skin.y] },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "Graph both lines. Each one starts at its b on the y-axis and then climbs or falls by its m.", math: `${fmtLine(m1, b1)}   ${fmtLine(m2, b2)}` },
    { text: "The solution is the ONE point that is on both lines: where they cross.", math: `(${fmtInt(px)}, ${fmtInt(py)})` },
    { text: "Read BOTH coordinates. An x on its own is not a solution to a pair of equations.", math: `x = ${fmtInt(px)} and y = ${fmtInt(py)}` },
    { text: "Check it by putting both numbers back into both equations. The b on the y-axis is where a line starts, not where they meet.", math: `${showNumber(add(mul(m1, rat(px)), b1))} = ${fmtInt(py)} ✓` },
  ];

  // --- 4. distractors from registry error tags --------------------------
  // Offered as the wrong answers a player's point can land on, so the tags still
  // reach the engine when a grid entry misses.
  const candidates: Candidate[] = [
    // x-only: the x value reported with nothing for y
    { tag: "x-only", value: [rat(px), rat(0)] },
    // intercept-as-solution: one line's y-intercept mistaken for the crossing
    { tag: "intercept-as-solution", value: [rat(0), b1] },
    { tag: "intercept-as-solution", value: [rat(0), b2] },
    { tag: "x-only", value: [rat(py), rat(px)] },
  ];
  const fmt = (v: Answer): string => {
    const [a, b] = v as [Rational, Rational];
    return `(${showNumber(a)}, ${showNumber(b)})`;
  };
  const choice = buildChoice(rng, correct, candidates, fmt);

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${px},${py}|${m1.n},${m2.n}`),
    format: "plot-point",
    prompt,
    answer: correct,
    answerText: `(${fmtInt(px)}, ${fmtInt(py)})`,
    accept: acceptOrder([rat(px), rat(py)]),
    distractors: choice.distractors,
    errorTagsByAnswer: choice.errorTagsByAnswer,
    worked,
    params: { variant, skin: skinKey, crossing: `${px},${py}`, slopes: `${m1.n},${m2.n}` },
  };
}
