# Phase 1 notes

What Phase 1 built, where the packet had to be corrected, and what the next
session should decide. Read alongside `KICKOFF.md`, which defines the phase.

## What is green

```
pnpm curriculum   # merges + validates content/curriculum/*.json -> src/data/curriculum.json
pnpm test         # 151 tests, 13 files
pnpm mission      # prints a 20-problem mission with MK-* figure and AI-* input per problem
```

- `src/data/curriculum.json` — 83 skills (54 core + 29 honors), 10 chapters, quarters from
  `design/tokens.json → structure.quarterChapters`.
- `src/data/schedule.json` — placeholder dates from `docs/engine-rules.md`.
- `src/engine/` — `rng`, `rational`, `types`, `mastery`, `scheduler`, `tiers`, `queue`, `mathkit`.
  Pure; no Phaser import, no clock read, no storage. Every function that needs "now" takes it.
- `src/generators/ns/ns.1.1` – `ns.1.5` — every registry `errors[].tag` is a distractor recipe.
- `src/data/manual/ns.1.1.md` – `ns.1.5.md` — worked steps match the numbered steps one-to-one
  (3 for ns.1.1, 4 for the rest), enforced by test 7.

## Corrections made to the packet

1. **`content/curriculum/honors-grade8.json`** — `h8.g.b3` had the error tag `a+b=c`, which fails
   `skill.schema.json`'s `^[a-z0-9-]+$` pattern, so no registry file validated. Renamed to
   `add-sides-unsquared`. Nothing else referenced the old tag.

2. **`design/tokens.json`** — KICKOFF step 2 asks for `structure.subSkills = 83` and
   `honorsSkills = 29`. The packet copy already has both. (The older copy in
   `~/Downloads/design_handoff_mach_ops` still reads 78 / 24; the packet is the newer file.)

3. **`content/examples/generators/ns.1.4.ts`** — the template ships two distractor bugs that were
   carried into and then fixed in `src/generators/ns/ns.1.4.ts`:
   - It emits the tag `neg-distance`, which belongs to `ns.1.1` and `ns.1.5`. The `ns.1.4`
     registry has only `double-neg`, `negate-first`, `commute`, `initial-minus-final`. Removed.
   - In the change variant, `commute` (`second − first`) and `initial-minus-final` (`a − b`) are
     the same arithmetic, so `initial-minus-final` was always dropped as a duplicate and never
     reached a player. Each tag is now gated to the variant where it is the real mistake.

4. **`DESIGN_RECONCILIATION.md` section 2** — two registry representations are not in the
   rep → Math Kit table: `y=kx` (`rp.5.4`) and `words` (`h8.f.a2`). Both are text rather than
   figures, so `src/engine/mathkit.ts` files them under MK-0 with `equation`. **Confirm or
   reassign before the Math Kit renderer is built.**

## Contract extensions

`Problem` in `content/GENERATOR_SPEC.md` section 2 gained three fields. Each is needed by a rule
the spec itself states:

| Field | Why |
| --- | --- |
| `options`, `correctIndex` | Section 4 requires the correct answer's *position* to be drawn from the seed and tested for a 20–30% distribution per slot. That needs the laid-out order, not just the distractor set. |
| `answerText`, `optionText` | Section 4 requires option text "formatted identically to the correct answer". The formatted form has to leave the generator, since only the generator knows whether a value should read as `3/4` or `0.75`. |

## Deviations from GENERATOR_SPEC section 7

Two of the eight property tests cannot hold as literally written. Both are implemented as the
property the rule is actually protecting, and the reasoning is in `tests/generators/harness.ts`.

1. **Test 2, "all hashes unique within a tier across 10,000 seeds."** Unreachable for the
   registry's own tier-1 ranges. `ns.1.4` tier 1 is `a in [0,30]`, `b in [1,40]` — 1,240 possible
   draws in total, so 10,000 seeds must repeat, and `ns.1.2` tier 1 has only 800. The measured
   repeat rates match coupon-collector expectation exactly, i.e. the generators are not clumping.
   The test instead asserts a per-tier distinct-hash floor (declared in each skill's test file,
   derived from its registry ranges) plus a bias guard: no single hash may take more than 1% of
   the 10,000 draws. **If the registry intends 10,000 distinct tier-1 problems, the `gen` ranges
   need widening — that is a content decision, not a code one.**

2. **Test 5, "correct-answer position 20–30% per slot over 100 seeds."** 100 samples of a 4-way
   split has a standard deviation of 4.3 points, so a 20–30% band fails on noise roughly a
   quarter of the time per slot. Measured over 1,000 seeds instead, where every tier of every
   generator lands inside 21.6%–28.8%. The band is also read as "uniform share ±5 points", so a
   two-option comparison is checked at 45–55% rather than 20–30%.

Related: **a two-way comparison cannot carry three distinct distractors.** `ns.1.1`'s compare
variants have exactly two possible answers, so they use `pick-one:greater` with 2 options and 1
distractor. The tag still records *why* the wrong one was picked, which is what the engine logs.

## Registry `gen` notes that were ambiguous

KICKOFF asks for this list. Assumptions taken are in brackets; all are cheap to change.

| Skill | Ambiguity | Assumption |
| --- | --- | --- |
| `ns.1.1` | T1 says "compare two integers; find \|n\| for an integer" — two different questions with no weighting given. | Two variants, drawn 50/50. |
| `ns.1.1` | T2 says "a fraction and a decimal with mixed signs" but does not forbid a fraction that reduces to a whole number, which would erase the contrast. | Numerators are never whole multiples of the denominator; decimals are never whole. |
| `ns.1.1` | T3 says "one repeated magnitude with opposite signs" but not whether the pair may be fractional. | The mirrored pair is always a whole number; the rest may be fractions. |
| `ns.1.1` | T4 says "distance between two rationals" without fixing the form of the givens. | Each given is independently a 1-place decimal or an integer. |
| `ns.1.2` | T3 says "three terms, two of which sum to 0" but not where the pair sits. | Three layouts, drawn evenly, so position is never the cue. |
| `ns.1.2` | T4 says "3-4 signed changes in a story" with no bound on each leg. | Each leg is in [−40, 40] and never 0. |
| `ns.1.3` / `ns.1.5` | "unlike denominators (2..12)" with "lcm <= 60" — some pairs in that range exceed 60 (7 and 11 gives 77). | Denominator pairs are redrawn until their lcm is 60 or less. |
| `ns.1.3` | T4 says "three rationals mixing fractions and decimals" without fixing the pattern. | Fraction, decimal, fraction. |
| `ns.1.3` / `ns.1.5` | "mixed numbers up to 5" — unclear whether that bounds the whole part or the value. | It bounds the whole part: numerators go up to `5 × denominator`. |
| `ns.1.5` | T1 says "one negative" but not which one. | Drawn 50/50 between the two positions. |
| all five | The registry never says which of a skill's `formats` a given tier should use. | Choice and free-entry formats alternate on the seed; tiers 3–4 of `ns.1.4` are free-entry, per the template. |

## Also worth a decision

- **Khan Academy links.** The registry stores a unit key plus a search phrase (`K-NEG:absolute
  value`), not a URL. All five manual pages use the Grade 7 negative-numbers unit URL. These are
  unverified — someone should open each one before the pages ship.
- **Node version.** KICKOFF says Node 20; `.nvmrc` pins 20 and `engines` allows `>=20`. The suite
  was actually run on Node 26.7.0.
- **Terrain tiles** are still not delivered (`design/README.md` "Not delivered"). Phase 2 needs
  Kenney CC0 top-down tiles matched to the Component Library terrain swatches.
- **The full game design doc export is still outstanding.** `docs/engine-rules.md` carries the
  progression engine, the schedule and the build plan until it lands; `docs/design.md` is the
  design system only. When the full export arrives it becomes the source of truth.
