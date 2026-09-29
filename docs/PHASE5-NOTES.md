# Phase 5 notes

Chapters 5 and 6: the rest of Quarter 2 and the first unit of Quarter 3.

## What landed

```
pnpm dev          # play it
pnpm test         # 40 generators, 6 campaigns
pnpm build        # typecheck + production bundle
```

- **Chapter 5, Ratios and Proportions** — `rp.5.1` – `rp.5.6`, ten sorties
  ending in the Tomcat Qualification.
- **Chapter 6, Percents** — `rp.6.1` – `rp.6.6`, ten sorties ending in the Eagle
  Qualification.
- Every one with a Flight Manual page and the eight property tests.

**40 of the 83 skills** now have generators, pages and tests: Chapters 1–6 and
the seven Q1 honors skills.

## Two new Math Kit figures

Chapter 5 is the first chapter that cannot be drawn on a number line.

| Figure | What it is for |
| --- | --- |
| `coordinate-plane` (MK-2) | Proportional graphs. The origin is always drawn and labelled, because whether the line passes through it is the whole question. Series may now carry names, so a card can say "LINE A" instead of describing the line. |
| `double-number-line` (MK-4) | Rates and the percent proportion. Two parallel scales with matching tick positions, so the pairing between the quantities is the thing you see. |

`ratio-table`, `arrow-table`, `balance-table` and `fact-family` all route to the
existing table renderer.

## Bugs this phase found

1. **Cards that stated their own answer.** `rp.5.5` named k in the prompt of the
   question asking for k; the graph carries it now. The same variant then listed
   its options as "THE LINE THROUGH (0, 0)" and "THE LINE THROUGH (0, 3)", which
   a student can answer without looking at the graph at all. The lines are named
   A and B, and which one is proportional varies.
2. **A yes/no question that was not a coin flip.** `rp.5.3` drew its three table
   kinds uniformly, so "not proportional" was right two thirds of the time and
   always answering no scored 67%. Worse, the `equation` variant never broke
   proportionality at all: tiers 3 and 4 were 100% yes. Both are balanced now.
3. **Quantities that cannot exist.** `rp.5.4` asked for 25½ missiles and `rp.6.2`
   for 12.5% of an aircraft. Counting skins swap to a continuous quantity when
   the values are not whole, and percent wholes are drawn as multiples of 40.
4. **A question that never stated its whole.** `rp.6.2` asked for a percent of a
   number it had not given. Each skin now carries a sentence that states it.
5. **Worked steps that solved a different problem.** `rp.6.4` walked through the
   percent-change pair while the prompt asked for percent error. The steps branch
   on the variant.
6. **The same denominator bias as `ns.2.3`.** `rp.6.1` drew a denominator and
   then a numerator, which is not drawing a value. It draws from the value space
   directly.
7. **"the the hangar fee".** `rp.6.3` prepended an article to a skin phrase that
   already had one, and started sentences in lower case. Articles live in the
   templates, and a `startCase` helper fixes the openings.

8. **A table whose x values repeated.** `rp.5.3` drew a fresh multiplier per
   column, so 2x3 and 3x2 both gave 6 and the table read "1, 6, 6, 8". One
   start and one step now.
9. **A commission that "costs".** `rp.6.3` ran a bounty through the shop's
   sentence: "a kill bounty costs 260 CR ... what do you pay in total?" Each
   skin now owns its opening clause and its question, and the multi variant
   keeps to the skins where two percents really are added.

Numbers 1, 3, 4, 8 and 9 were found by reading generated cards, not by any test.
The tests confirm a card is well formed; only reading it tells you it makes
sense.

## Four interface bugs the new content exposed

None of these are Chapter 5 or 6 code. They were latent, and more skills and
more figure kinds set them off.

1. **The problem card redrew its options in the wrong column.** The layout used
   the *rendered* figure and the redraw used the figure *spec*, so any skill
   whose figure kind has no renderer yet (`hundred-grid`, `tape-diagram`) got
   its labels at full width and its boxes in the figure layout. The resolved
   column is stored on the card now and every redraw reuses it.
2. **Table row names ran over the first value.** `table()` split the width
   evenly, so "MISSILES" was drawn straight through the 4 beside it. The name
   column is measured; the data columns share what is left.
3. **The Flight Manual library ran off the bottom of the screen.** Twenty-eight
   tiles fitted; forty do not. It pages twelve at a time, and back and paging
   moved into the header where they cannot be pushed off.
4. **Two-line briefs were clipped by the briefing card**, and a four-standard
   manual header was drawn through the status pill. Both now have the room they
   need. The manual also stops reserving its 180 px diagram slot when there is
   no figure to draw in it.

## Assumptions to confirm

| Area | Assumption | Why |
| --- | --- | --- |
| Percent wholes | The whole in a percent-of question is always a multiple of 40 | It makes every registry rate (2.5% upward) land on a whole number of aircraft or missiles. The registry fixes the rates but not the wholes. |
| Counting skins | A skin that counts things (missiles, aircraft) swaps to fuel when the answer is not whole | Half a missile is not a quantity. The registry names the skins but not this rule. |
| Percent error | The answer is the absolute value, so it is never negative | The registry formula has the bars; nothing says whether an over-estimate and an under-estimate of the same size are the same card. They are treated as the same. |
| Boss unlocks | Chapter 5 earns the F-14, Chapter 6 the F-15C | `design/README.md` fixes the chain order; the build follows it, one airframe per unit boss. |
| Stacked discounts | Two discounts multiply; the question always states which comes first | Order does not change the result, but the wording has to pick one. |

## Still not delivered

- **Chapters 7–10** and the Q2–Q4 honors skills: 43 of 83 skills.
- **The eleven Q2 honors skills attached to Chapter 5** (`h8.f.*`, `h8.ee.b5`,
  `h8.ee.b6`, `h8.ee.c8a`, `h8.ee.c8b`, `h8.g.a1d`). Most need interactive
  inputs — plotting a point, dragging a line — rather than a new generator.
- **`h8.ee.c9`** (graph a linear inequality). The coordinate-plane renderer now
  exists, so this is unblocked but not built.
- **Terrain tiles**, **04C Tanker refuel**, **Profile**, **Fleet**, **Unlock
  reveal**, and the **`/dad`** views. Unchanged from `docs/PHASE3-NOTES.md`.
- **Flight School lesson 1** still explains the stick rather than handing it over.
