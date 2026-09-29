# Phase 6 notes

Chapters 7 and 8: probability and statistics, and the rest of Quarter 3.

## What landed

```
pnpm dev          # play it
pnpm test         # 54 generators, 8 campaigns
pnpm build        # typecheck + production bundle
```

- **Chapter 7, Probability and Statistical Measures** — `sp.7.1` – `sp.7.6`, ten
  sorties ending in the Hornet Qualification.
- **Chapter 8, Statistics** — `sp.8.1` – `sp.8.4`, nine sorties ending in the
  Nighthawk Qualification.
- **Four Q3 honors skills** — `h8.sp.b4a` and `h8.sp.b4b` (compound events, on
  Chapter 7), `h8.sp.a1` and `h8.sp.a3` (scatter plots, two-way tables and
  linear models, on Chapter 8).
- Every one with a Flight Manual page and the eight property tests.

**54 of the 83 skills** now have generators, pages and tests: Chapters 1–8, the
seven Q1 honors skills and four of the Q3 honors skills.

## A new engine module

`src/engine/stats.ts` — mean, median, mode, the five-number summary, IQR, MAD
and the shape of a distribution, all on `Rational` rather than `number`.

Statistics is the first chapter where the same data is read several ways in one
card, so drift matters more than usual: a mean of 1/3 has to still be 1/3 when
the MAD divides by it. The quartile convention is the registry's own — on an odd
count the median belongs to NEITHER half — and the module exports the *wrong*
convention too, as `quartilesIncludingMedian`, because that is a named error tag
and the generator should not have to re-derive a mistake.

## Four new Math Kit figures

| Figure | What it is for |
| --- | --- |
| `dot-plot` (MK-6) | Shape before any number is computed. Stacks repeats, draws two plots for a comparison, and can mark the mean on a MAD card. |
| `box-plot` (MK-6) | The five-number summary to scale, one or two on a shared axis. |
| `likelihood-line` (MK-1) | 0 to 1 with the five words written under it, so a probability has something to be judged against. |
| `tree-diagram` (MK-5) | One column per stage with every branch drawn, because the count of leaves IS the sample space. |

`scatter-plot` routes to the existing coordinate plane; the frequency, outcome
and two-way tables route to the existing table renderer.

## Bugs this phase found

1. **A card whose figure held the answer, again.** `sp.7.1`'s likelihood question
   plotted the probability on the very line the player was asked to place it on.
   The counts moved into the sentence and the line is a bare scale.
2. **Questions with no defensible answer.** 7 out of 15 is 0.467, and calling
   that UNLIKELY rather than EVEN CHANCE is a coin toss. `sp.7.1` now only draws
   counts that are exactly half or clearly one side of it, and `sp.7.4` only
   asks which squadron is more consistent when the two IQRs are 8 apart.
3. **Yes/no questions that were not coin flips.** `sp.7.5`'s tier 3 always
   answered MEDIAN, because the extra sortie was always an outlier. Half of them
   are ordinary now. The same correction went into `sp.7.2`, `sp.8.1`, `sp.8.2`
   and `sp.8.4`, and every two-option card in both chapters now sits at 50/50
   measured over 12,000 draws.
4. **A comparison that rewarded the wrong reading.** `sp.7.4`'s tier 4 asks which
   squadron is more consistent; the pair is now drawn so the squadron with the
   narrower RANGE is the one with the WIDER IQR, in 94% of cards. Reading the
   ends and reading the middle half give different answers, and only one of them
   is consistency.
5. **Statistics questions with ugly answers.** A MAD of 29 7/9 seconds is not
   something a twelve-year-old writes down. `sp.7.4` builds its MAD sets around
   a whole mean whose deviations total a multiple of the count; `h8.sp.a1` gives
   every two-way table row a total of 200 so a share is a whole percent.
6. **Two modes where the card said "the mode".** `sp.7.3` drew its values with
   replacement, so a set could repeat two different values by accident. Values
   are drawn distinct and exactly one is duplicated.
7. **Negative probabilities and negative ranges as options.** The magnitude
   fallback happily offers `correct − 10`, which on a probability card is
   nonsense. Every recipe in these chapters is written to stay in range, and the
   answers are kept away from 0 so the real recipes always survive.
8. **Questions about things that cannot happen.** `h8.sp.b4b` asked how many
   outcomes of a die and a coin are "doubles". The phrase variant now rolls two
   matching numbered devices.
9. **A re-seeded retry reported the wrong seed.** Five generators redraw when a
   draw is unusable, and they did it by calling `generate(tier, seed + salt)`.
   The returned Problem then carried the salted seed, breaking the contract that
   `p.seed` is the seed you asked for. Retries go through an internal builder
   that keeps the requested seed and is bounded at eight attempts.

## One test correction

The harness's slot-distribution test applied the spec's fixed 20–30% band to any
tier with at least 500 four-option samples. At half a sweep that band is barely
two and a half standard deviations, and a tier mixing a yes/no variant with a
four-option one failed on noise: over 4,000 seeds the same generator sits at
24–26%. The fixed band now applies only when the whole sweep is four-option;
anything narrower gets the four-sigma band already used for the other widths.

## Five interface bugs the new content exposed

None of these are Chapter 7 or 8 code.

1. **Long options ran out of their rows.** "the 210 aircrew in the biggest
   squadron" is a perfectly good answer and did not fit a fixed-width pick row.
   Options wrap and their row grows.
2. **The card header ran under the timer.** An honors skill with a multiplier
   made the left side long enough to collide, printing "HONORSUNTIMED". The
   header is squeezed to whatever room the timer leaves.
3. **The likelihood line's five words overlapped.** Side by side in the card's
   figure column they were one unreadable run. They sit on two rows now.
4. **A single dot plot sat on the floor of its slot** and a single box plot
   hugged the top of its own. Both are centred.
5. Same class as Phase 5: a figure kind with a spec but no renderer. The manual
   already stopped reserving an empty slot; nothing new was needed here.

## Assumptions to confirm

| Area | Assumption | Why |
| --- | --- | --- |
| Quartiles | The median is excluded from both halves on an odd count | The registry states it and names the alternative as an error tag. Other conventions exist; this one is the one being taught. |
| "Is it unfair" | A run more than half again away from the expected count is worth questioning; within a tenth is not | The registry asks the player to "explain a discrepancy" but sets no threshold. The two bands are drawn far enough apart that no card sits between them. |
| "Meaningful difference" | Two MADs or more, or box plots that do not overlap | `sp.8.3`'s key names the MAD ratio; the box-plot reading is the standard one. Neither is in the registry as a number. |
| Sample size | A fiftieth of the population is enough; a thousandth is not | The registry asks the player to "judge whether a sample size is large enough" without saying against what. |
| Boss unlocks | Chapter 7 earns the F/A-18E, Chapter 8 the F-117 | `design/README.md` fixes the chain order; the build follows it, one airframe per unit boss. |

## Still not delivered

- **Chapters 9 and 10**, and the Q2 and Q4 honors skills: 29 of 83 skills.
- **`h8.sp.a2`** (line of fit) attaches to Chapter 8 but its registry format is
  `drag-line` — the player drags a line onto a scatter plot. That needs an
  interactive input, not a generator, so it is parked with the Math Kit work.
- **The eleven Q2 honors skills attached to Chapter 5.** Unchanged from
  `docs/PHASE5-NOTES.md`; most need interactive inputs too.
- **`h8.ee.c9`** (graph a linear inequality). Still unblocked, still unbuilt.
- **Terrain tiles**, **04C Tanker refuel**, **Profile**, **Fleet**, **Unlock
  reveal**, and the **`/dad`** views. Unchanged from `docs/PHASE3-NOTES.md`.
- **Flight School lesson 1** still explains the stick rather than handing it over.
