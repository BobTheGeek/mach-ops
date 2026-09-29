# Phase 4 notes

Chapters 3 and 4: the rest of Quarter 1 and all of Quarter 2's first unit.

## What landed

```
pnpm dev          # play it
pnpm test         # 34 generators, 4 campaigns
pnpm build        # typecheck + production bundle
```

- **Chapter 3, Expressions** — `ee.3.1` – `ee.3.4`, nine sorties ending in the
  Warthog Qualification.
- **Chapter 4, Equations and Inequalities** — `ee.4.1` – `ee.4.7`, ten sorties
  ending in the Falcon Qualification.
- Every one with a Flight Manual page and the eight property tests.

**28 of the 83 skills** now have generators, pages and tests: Chapters 1–4 and
the seven Q1 honors skills. `h8.ee.c7a` and `h8.ee.c7b` become reachable now that
Chapter 4 exists.

## Two new engine modules

Chapters 3 and 4 are about symbols rather than numbers, which a `Rational`
cannot hold on its own.

| Module | What it is for |
| --- | --- |
| `src/engine/linear.ts` | `ax + b` with exact rational coefficients. Canonical parsing, so `2 + 3x` and `3x + 2` are the same answer — which GENERATOR_SPEC section 2 requires. Factoring that accepts only the *fully* factored form: `2(3x + 6)` expands to `6x + 12` but is not `6x + 12` factored. |
| `src/engine/inequality.ts` | The four glyphs (`<` `≤` `>` `≥`, never `<=`), and the flip rule in one place so every Chapter 4 generator applies it identically. |

## Bugs this phase found

1. **Candidate values were computed before their guard.** A distractor recipe
   gated off for a variant still had its value evaluated, so one that divided by
   a quantity that is zero elsewhere crashed the generator. `Candidate.value` may
   now be a thunk, evaluated only after `when` passes — that removes the class
   rather than patching the one case.
2. **Mixed numbers cannot be read back.** An inequality boundary written as a
   mixed number loses its space in any input box and parses as an improper
   fraction with the wrong value, so generators were rejecting their own answers.
   Expression and inequality answers now use improper fractions throughout.
3. **Both parsers rejected the thousands separators the game itself renders.**
   `fmtInt` groups thousands, so a boundary of 2,168 came back as unparseable and
   the generator failed its own answer.
4. **`ee.3.4` with no constant.** The greatest common factor swallows the whole
   coefficient — `5/2x` factors as `5/2(x)`, not `1/2(5x)` — so the intended
   answer was not the fully factored one and the card rejected it.
5. **Mission focus was never wired in.** `campaign.ts` said sortie 7 introduces
   `ee.4.7`; the queue ignored it and served none. `buildQueue` now takes
   `focusSkills` for the current-unit slice.
6. **Then focus swallowed the whole sortie.** A first sortie has nothing overdue
   and nothing warm, so both of those slices fell back — to the narrowed focus
   pool. Ten copies of one skill, and past half a mission no arrangement can keep
   a skill off consecutive cards. The fallback now excludes the focused skill,
   which already owns its own slice.

Numbers 5 and 6 were both found by playing a Chapter 4 sortie and reading the
queue, not by any test.

## Assumptions to confirm

| Area | Assumption | Why |
| --- | --- | --- |
| Mission focus | The current-unit slice draws only from the sortie's focus; weak and warm are untouched | The campaign promises "this sortie teaches this skill" and the rulebook fixes the slice shares, but nothing says how the two meet. |
| `ee.4.7` counts | A count question rounds **down**: 3.5 stores means 3 | The registry names the mistake ("reports 3.5 missiles") but not the rule. Rounding down is the only reading that fits a weight limit. |
| `ee.3.3` / `ee.3.4` | Bracket contents and factored expressions never have a zero constant | With no constant there is nothing to forget and nothing to factor, so the skill's own error tags cannot fire. |
| Boss unlocks | Chapter 3 earns the A-10C, Chapter 4 the F-16C | DESIGN_RECONCILIATION section 4 fixes the chain order (t38 → f4 → a10 → f16); the build follows it, one airframe per unit boss. |

## Still not delivered

- **Chapters 5–10** and the Q2–Q4 honors skills: 55 of 83 skills.
- **`h8.ee.c9`** (graph a linear inequality) attaches to Chapter 4 but needs a
  coordinate-plane renderer, so it is parked with the Math Kit work.
- **Terrain tiles**, **04C Tanker refuel**, **Profile**, **Fleet**, **Unlock
  reveal**, and the **`/dad`** views. Unchanged from `docs/PHASE3-NOTES.md`.
- **Flight School lesson 1** still explains the stick rather than handing it over.
