# Mach Ops: Weapons-Grade Math — Content and Generator Spec

This package is the data the dev agents build from. It has three parts:

1. `curriculum/*.json` — the skill registry: 54 core sub-skills (Big Ideas Tennessee Math 7, one per textbook section) plus 29 honors sub-skills (Grade 8 standards from the FSD Honors Math 7 syllabus). Every skill carries its standards, source lessons, representations, answer formats, four difficulty tiers, generator parameter notes, error patterns for distractors, and cockpit skins.
2. This file — the contract every generator, distractor builder, manual page and test must satisfy.
3. `examples/` — one fully worked generator (`ns.1.4` subtract integers) and one worked Flight Manual page, as the pattern for the other 82.

Design decisions behind the contract live in the design doc ("Problem generation & anti-memorization", "Adaptive progression engine", "Flight manual"). This file is the executable version.

## 1. Skill ids

- Core: `<cluster>.<chapter>.<section>` — `ns.1.4`, `ee.4.3`, `rp.5.2`, `sp.7.6`, `g.10.4`. Cluster prefixes: `ns` number system, `ee` expressions/equations, `rp` ratios/proportions/percents, `sp` statistics/probability, `g` geometry.
- Honors: `h8.<cluster>.<standard>` — `h8.ee.a1`, `h8.f.b4`, `h8.sp.b4a`.
- Ids are stable forever. The dashboard, save file, manual pages and schedule all key on them.

## 2. The Problem contract

Every generator is a pure function:

```ts
type Tier = 1 | 2 | 3 | 4;

interface Problem {
  skill: string;                 // registry id
  tier: Tier;
  seed: number;                  // the seed that produced it, for replay
  hash: string;                  // sha1 of skill + tier + canonical params
  format: AnswerFormat;          // one of the skill's registry formats
  prompt: PromptSpec;            // structured, not a string (see 3)
  answer: Answer;                // canonical correct answer
  accept: (input: Answer) => boolean;  // equivalence: 3/4 == 0.75 == 75%
  distractors?: Distractor[];    // for multiple-choice; 3 items, each tagged
  worked: WorkedStep[];          // the solution in the manual's fixed steps
  errorTagsByAnswer: Record<string, string>; // wrong-answer text -> error tag
  params: Record<string, number | string>;   // the raw draw, for logging
}

interface Distractor { value: Answer; tag: string; }   // tag = registry error tag
interface WorkedStep { text: string; math?: string; }   // math in the app's math-text style

type AnswerFormat =
  | "numeric" | "fraction" | "sci-notation" | "expression"
  | "multiple-choice" | "yes-no" | "order" | "table-fill"
  | "plot-point" | "drag-line" | "shade-region" | "number-line-select"
  | "graph-select" | "shape-select" | "box-plot-read" | "likelihood-select"
  | `pick-one:${string}`;

function generate(skill: string, tier: Tier, seed: number, opts?: { skin?: string; transfer?: boolean }): Problem
```

Rules:

- **Deterministic.** Same `(skill, tier, seed)` gives byte-identical output. Use mulberry32 seeded with `hash32(skill + tier + seed)`; never `Math.random`.
- **Choose the answer first.** Pick `x` (or the target quantity), then derive the givens so the answer is clean at tiers 1–3. Tier 4 may produce non-integer answers only where the registry says so.
- **Rotate structure, not just numbers.** Each generator has a `variants[]` list (unknown position, representation, direction, sign mix). The variant is drawn from the seed, weighted so every variant appears at least 10% of the time.
- **Skins are wrappers.** The math is generated skin-free; a skin template then binds `params` into mission text. Skin choice never changes the numbers. Each skill's registry `skin` lists the framings; keep at least 3 templates per skill so wording is not a cue.
- **Equivalence, not string match.** `accept()` handles `-3,500` vs `-3500`, `3/4` vs `0.75` vs `75%`, `2x + 4` vs `4 + 2x`, `π` form vs `3.14` within 0.5% where the registry allows. Expression answers are compared by normalizing to a canonical polynomial.
- **`worked[]` follows the manual's steps exactly** so the Flight Manual's live worked example and the post-fast-wrong pop-in are the same code path.

## 3. Prompts are structured

Prompts are data so the renderer can lay them out with the Math kit:

```ts
interface PromptSpec {
  text: string;                       // with {{slots}} for params
  math?: string[];                    // display-math lines
  figure?: FigureSpec;                // number-line | coordinate-plane | table | tape | hanger | area-model | tree | box-plot | dot-plot | angle | net | solid | scale-drawing | scatter | two-way-table
  units?: string;
}
```

Figures are described by data (points, ranges, labels), never drawn by the generator. The Math kit component in the design system renders them.

## 4. Distractors

For `multiple-choice` and `pick-one` formats:

- Exactly 3 distractors, each computed from a registry error tag using its `distractor` recipe. If a recipe collides with the correct answer or another distractor, fall through to the next tag; if fewer than 3 distinct values remain, add a "magnitude" distractor (correct × 2 or / 2 or ± 10) tagged `magnitude`.
- Never a random number. Every wrong option must be reachable by a real mistake, because the engine logs which tag the student picked.
- Answer position is drawn from the seed; over 100 seeds each position must be the correct one 20–30% of the time (test).
- Option text is formatted identically to the correct answer (same units, same decimal places).

## 5. Tiers

Tier semantics are the four registry strings per skill. Engine rules (from the design doc): tier up after 2 consecutive fast-correct, down after 2 wrong at the same tier; tiers are per skill. Generators must implement all four; tier 4 is the "transfer-ready" tier and is what `opts.transfer = true` draws from, combined with a second skill's parameters when the registry `gen` notes allow.

## 6. No-repeat guards

- `hash` = sha1 of `skill|tier|variant|canonical params`. The mission builder rejects any hash seen in the last 500 served problems (kept in the save file).
- Near-repeat: reject if the same variant and the same answer appeared in the last 20 problems for this skill.
- Both guards retry with `seed + 1`, up to 50 times, then log and accept.

## 7. Tests every generator ships with

`tests/generators/<skill>.test.ts`, using Vitest + fast-check:

1. 10,000 seeds × 4 tiers produce a valid Problem (schema check).
2. All hashes unique within a tier across 10,000 seeds (allow ≤ 0.1% collisions at tier 1 for skills with small spaces, e.g. `ns.2.3` terminating fractions).
3. `accept(answer)` is true; `accept(each distractor)` is false.
4. Distractor tags are all registry tags for the skill.
5. Correct-answer position distribution 20–30% per slot over 100 seeds.
6. Every variant appears at least 10% of the time over 1,000 seeds.
7. Worked steps count matches the manual page's "How to solve it" step count.
8. Tier 1 answers are integers (or the registry's stated form) 100% of the time.

## 8. Flight Manual pages

One markdown file per skill at `src/data/manual/<skill>.md`, front matter:

```yaml
---
skill: ns.1.4
title: Subtracting integers
standards: [7.NS.A.1b, 7.NS.A.3]
honors: false
chapter: 1
section: "1.4"
sources:
  im: [G7.U5.L5, G7.U5.L6]
  khan: "https://www.khanacademy.org/math/cc-seventh-grade-math/cc-7th-fractions-decimals"  # verified link goes here
reps: [number-line]
---
```

Body sections, in this order and with these exact headings (the renderer keys on them):

1. `## What it is` — 2–3 sentences plus one bolded key idea (the registry `key`).
2. `## How to solve it` — 3–6 numbered steps. The generator's `worked[]` must produce one WorkedStep per numbered step.
3. `## Worked example` — a single line `{{worked-example}}`; the app fills it live from the generator at the player's tier.
4. `## Watch out for` — one bullet per registry error tag, `**Mistake:** ... **Fix:** ...`.
5. `## Try one` — a single line `{{try-one}}`; the app fills it.
6. `## Where it shows up` — mission types, aircraft systems, the real-aircraft tie-in from the dossiers, and a `[Watch on Khan Academy](url)` link.

Style: 7th-grade reading level, define each math term the first time, no textbook text, IM/OUR explanations adapted with attribution in the credits screen. Bob reviews every page against the Big Ideas method before it ships (see design doc "Authoring the 83 pages").

## 9. Representations the Math kit must render (union of registry `reps`)

number-line, vertical-number-line, zero-pairs, debt-table, velocity-time, fact-family, long-division, area-model, area-model-reverse, tape-diagram, tiles, vertical-format, hanger-diagram, test-point, ratio-table, double-number-line, arrow-table, coordinate-plane (points, single line, two lines, shaded region, sketch, right triangle), table-graph-equation, scale-drawing, grid, scale-bar, hundred-grid, part-whole-bar, equation, tape-diagram-100, balance-table, likelihood-line, sample-space-list, frequency-table, simulation, dot-plot, quartile-marks, skew-vs-symmetric, box-plot, population-sample-diagram, dot-plot-of-sample-means, proportion-table, parallel-dot-plots, side-by-side-box-plots, circle-labelled, C-vs-d-graph, wedges-to-parallelogram, grid-decomposition, straws, compass-construction, angle-diagram, net, can-label-net, layers-of-cubes, base-times-height, pour-demo, slice-visual, algebra-trick-10x, bracketing, expanded-form, powers-of-ten-line, place-value-shift, dilation-pair, slope-triangle, coordinate-plane-two-lines, coordinate-plane-shaded, mapping-diagram, coordinate-plane-sketch, scatter-plot, two-way-table, scatter-plot-with-line, tree-diagram, outcome-table, organized-list, square-and-cube-models, transversal-diagram, squares-on-sides, right-triangle-labelled, coordinate-plane-right-triangle, solids-labelled.

This list is the "Math kit" the design agent is building; every item here must have a renderer.

## 10. Build order

Phase 1 (engine + Chapter 1): implement `ns.1.1`–`ns.1.5` generators and manual pages first, using `examples/` as the template. Then Chapter 2. Honors skills for Q1 (`h8.ns.*`, `h8.ee.a*`, `h8.ee.c7*`) follow Chapter 2 since the class is in Q1 now. Chapters 3–10 and remaining honors follow the content-sprint recipe in the design doc, one chapter every 1–2 weeks, trailing the class.

## 11. Attribution (ship in the credits screen)

IM 6–8 Math was originally developed by Open Up Resources and authored by Illustrative Mathematics, and is copyright 2017-2019 by Open Up Resources. It is licensed under the Creative Commons Attribution 4.0 International License (CC BY 4.0). OUR's 6–8 Math Curriculum is available at https://openupresources.org/math-curriculum/. Adaptations and updates to IM 6–8 Math are copyright 2019 by Illustrative Mathematics, and are licensed under CC BY 4.0. The Illustrative Mathematics name and logo are not subject to the Creative Commons license.

Tennessee Academic Standards for Mathematics, Tennessee State Board of Education (public). Big Ideas Learning Tennessee Math is referenced for sequence and method names only; no text or problems are reproduced.
