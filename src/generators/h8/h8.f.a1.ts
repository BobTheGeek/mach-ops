// h8.f.a1 — What a function is (Grade 8 honors, attached to Chapter 5)
// Shape follows content/examples/generators/ns.1.4.ts.

import { mulberry32, hash32, sha1, pick, int, shuffle } from "../../engine/rng";
import type { Problem, Tier, WorkedStep, GenerateOpts, Answer } from "../../engine/types";
import { bind } from "../shared";

const SKILL = "h8.f.a1";

type Variant =
  | "mapping"  // a mapping diagram                       (tier 1)
  | "table"    // a table of values                        (tier 2)
  | "points"   // a set of ordered pairs, or a graph        (tier 3)
  | "rule";    // a description or an equation              (tier 4)

export const VARIANTS: Record<Tier, Variant[]> = {
  1: ["mapping"],
  2: ["table", "mapping"],
  3: ["points", "table"],
  4: ["rule", "points"],
};

const SKINS = {
  throttle: { input: "THROTTLE", output: "THRUST", rule: "every throttle setting gives one thrust reading" },
  tail: { input: "TAIL NUMBER", output: "PILOT", rule: "every aircraft has one pilot booked for the day" },
  slot: { input: "SLOT TIME", output: "RUNWAY", rule: "every slot time is assigned one runway" },
} as const;

type SkinKey = keyof typeof SKINS;

/** Rules whose graphs are and are not functions, for the tier-4 variant. */
const RULES: { text: string; isFunction: boolean }[] = [
  { text: "y = 3x − 4", isFunction: true },
  { text: "y = x², for every x", isFunction: true },
  { text: "y is the square ROOT of x, and both roots count", isFunction: false },
  { text: "x = y², for every y", isFunction: false },
  { text: "every pilot is paired with their squadron", isFunction: true },
  { text: "every squadron is paired with each of its pilots", isFunction: false },
  { text: "y = |x|", isFunction: true },
  { text: "x² + y² = 25, the whole circle", isFunction: false },
];

export function generate(tier: Tier, seed: number, opts: GenerateOpts = {}): Problem {
  const rng = mulberry32(hash32(`${SKILL}|${tier}|${seed}`));
  const variant = opts.transfer && tier === 4 ? "rule" : pick(rng, VARIANTS[tier]);
  const skinKey = (opts.skin as SkinKey | undefined) ?? pick(rng, Object.keys(SKINS) as SkinKey[]);
  const skin = SKINS[skinKey];

  // --- 1. build a relation that is, or is not, a function ----------------
  // The registry's split: half of them are functions. The foils repeat an
  // OUTPUT, which is still a function, to catch the reverse mistake.
  // Two of the three kinds ARE functions, so drawing them evenly makes "yes"
  // right two times in three. The verdict is drawn first, then a kind of it.
  const yes = rng() < 0.5;
  const kind = yes ? (rng() < 0.5 ? "function" : "repeated-output") : "not";
  const rule = pick(rng, RULES);
  const isFunction = variant === "rule" ? rule.isFunction : kind !== "not";

  const count = int(rng, 3, 4);
  const inputs = shuffle(rng, [10, 20, 30, 40, 50, 60, 70, 80]).slice(0, count);
  const outputRaw = shuffle(rng, [2, 4, 6, 8, 10, 12, 14]).slice(0, count);
  const outputs = kind === "repeated-output"
    ? outputRaw.map((v, i) => (i === 1 ? outputRaw[0]! : v))
    : outputRaw;
  // "not a function" repeats an INPUT with two different outputs.
  const pairs = kind === "not"
    ? [...inputs.map((x, i) => [x, outputs[i]!] as const), [inputs[0]!, outputs[0]! + 5] as const]
    : inputs.map((x, i) => [x, outputs[i]!] as const);

  const listed = pairs.map(([x, y]) => `(${x}, ${y})`).join("  ");

  // --- 2. prompt --------------------------------------------------------
  const text =
    variant === "mapping"
      ? bind("Each {{in}} is mapped to a {{out}}. Is this a FUNCTION?", { in: skin.input.toLowerCase(), out: skin.output.toLowerCase() })
      : variant === "table"
        ? bind("This table pairs {{in}} with {{out}}. Is it a FUNCTION?", { in: skin.input.toLowerCase(), out: skin.output.toLowerCase() })
        : bind("These pairs are {{pairs}}. Is that a FUNCTION?", { pairs: listed })
          + "";

  const ruleText = bind("The rule is: {{r}}. Is that a FUNCTION?", { r: rule.text });

  const prompt = {
    text: variant === "rule" ? ruleText : text,
    figure: variant === "rule"
      ? undefined
      : {
          kind: (variant === "mapping" ? "mapping-diagram" : "table") as "mapping-diagram" | "table",
          rows: [[skin.input, ...pairs.map(([x]) => String(x))], [skin.output, ...pairs.map(([, y]) => String(y))]],
        },
  };

  // --- 3. worked steps: MUST match the manual's "How to solve it" --------
  const worked: WorkedStep[] = [
    { text: "List the INPUTS. In a table that is the top row; in a set of pairs it is the first number of each.", math: pairs.map(([x]) => String(x)).join(", ") },
    { text: "Look for the same input twice. If one input has TWO different outputs, it is not a function.", math: kind === "not" ? `${pairs[0]![0]} appears twice` : "every input appears once" },
    { text: "The same OUTPUT twice is fine. Two aircraft can share a pilot; one aircraft cannot have two.", math: kind === "repeated-output" ? "one output repeats — still a function" : "no repeat" },
    { text: "On a graph it is the VERTICAL line test: if a vertical line ever crosses the graph twice, it is not a function.", math: isFunction ? "FUNCTION" : "NOT A FUNCTION" },
  ];

  const answer = isFunction ? "YES" : "NO";
  const foil = isFunction ? "NO" : "YES";
  const options = ["YES", "NO"];
  const tag = kind === "repeated-output" ? "repeated-output-not-function" : "vertical-line-reversed";

  return {
    skill: SKILL, tier, seed,
    hash: sha1(`${SKILL}|${tier}|${variant}|${variant === "rule" ? rule.text : `${kind}|${pairs.map((p) => p.join(":")).join(",")}`}`),
    format: "yes-no",
    prompt,
    answer,
    answerText: answer,
    accept: (input: Answer) => String(input).toUpperCase() === answer,
    distractors: [{ tag, value: foil }],
    options,
    optionText: options,
    correctIndex: options.indexOf(answer),
    worked,
    errorTagsByAnswer: { [foil]: tag },
    params: { variant, skin: skinKey, kind, isFunction: String(isFunction) },
  };
}
