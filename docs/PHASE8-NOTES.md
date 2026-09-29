# Phase 8 notes

The interactive answer inputs, and the last twelve skills.

## What landed

```
pnpm dev          # play it
pnpm test         # 83 generators, 10 campaigns
pnpm build        # typecheck + production bundle
```

- **Three interactive inputs** — AI-3 plot a point, AI-4 drag a line, AI-5 shade
  a region, all in `src/game/ui/gridInput.ts`.
- **The last twelve skills** — the eleven Q2 honors skills attached to Chapter 5
  (`h8.g.a1d`, `h8.ee.b5`, `h8.ee.b6`, `h8.ee.c8a`, `h8.ee.c8b`, `h8.ee.c9`,
  `h8.f.a1`, `h8.f.a2`, `h8.f.a3`, `h8.f.b4`, `h8.f.b5`) and `h8.sp.a2` on
  Chapter 8.
- Every one with a Flight Manual page and the eight property tests.

**All 83 skills** now have a generator, a manual page and tests.

## The inputs

All three are the same coordinate grid with a different thing to move on it, so
they share one component.

| Input | What the player does | What the card gets back |
| --- | --- | --- |
| `plot-point` | Taps or drags a marker onto a lattice point | `[x, y]` as two Rationals |
| `drag-line` | Moves two handles; the line runs through them | `[m, b]` as two Rationals |
| `shade-region` | Taps one side of a drawn boundary | `"ABOVE"` or `"BELOW"` |

Three decisions are worth stating.

**Everything snaps to lattice points.** The answer to "where do these two lines
cross" is (3, −2), not (3.04, −1.97). A grid that reported what the finger did
rather than what it meant would mark a right answer wrong.

**Every input is drivable by keyboard.** Arrow keys nudge, and space swaps which
handle a line drag is holding. `docs/design.md` section 9 asks for that, and a
drag-only input would be the one part of the game a keyboard could not reach.

**The grid replaces the figure.** On these formats the grid IS the figure and
the input at once, so it takes the full width of the card. A 240 px figure
column is not something a twelve-year-old can hit a lattice point in.

## A development affordance

`?card=<skill>&tier=<n>` serves that one skill in a briefing's prep instead of
the queue's choice, behind `import.meta.env.DEV`. An honors skill turns up in
maybe one prep card in ten, and "reload until it appears" is not a way to look
at an input while building it.

## Bugs this phase found

1. **The readout did not follow the pointer.** The grid handled taps internally
   and told nobody, so "YOU: (3, −2)" only updated on an arrow key. The
   component takes an `onChange` now.
2. **Targets off the grid.** `h8.ee.b6` asked the player to drag a line through
   (−3, −14) on a board that stops at 10. Both points are chosen from the
   positions that are actually reachable.
3. **Intercepts off the grid.** `h8.ee.c8b` drew "y = 3x − 24" and asked the
   player to picture it. Only slopes that keep both intercepts on the board are
   offered.
4. **"y = 0x + 5".** Four generators wrote a flat line with a zero coefficient
   in it. A flat line is "y = 5".
5. **Distractors the card marked right.** Hand-built wrong answers for the grid
   formats collide with the right one on degenerate draws: a slope of 1 is its
   own reciprocal, an intercept of 0 its own negative, and (2, 2) at a scale
   factor of 2 both doubles and adds to (4, 4). Every hand-built distractor is
   now passed through the card's own `accept()` and dropped if it would be
   marked correct.
6. **A re-seeded retry reported the wrong seed**, in `h8.f.a2`. Same fix as
   Phase 6: an internal builder that keeps the requested seed.
7. **Yes/no cards that were not coin flips.** `h8.f.a1` drew three kinds of
   relation evenly and two of them are functions, so "yes" was right two times
   in three. `h8.g.a2`'s naming draw had the same shape. Both balanced.
8. **The axis label ran out of the card.** "MINUTES" was left-aligned at the
   right end of the plot.

## One harness note

A plot-point answer is a PAIR, and the harness's tier-1 form check maps over the
elements of an array answer — behaviour written for `order` answers, and right
here too: each coordinate of a crossing point is a lattice point. The test says
so rather than fighting it.

## Assumptions to confirm

| Area | Assumption | Why |
| --- | --- | --- |
| Snapping | Every grid entry snaps to a whole lattice point | The registry's "estimate a non-integer crossing" tier is served by a whole-number crossing with the estimate framed in the prompt. A sub-unit answer would need a tolerance, and a tolerance on a tap is a guess about intent. |
| Line handles | Two handles, both draggable, either one nearest the tap | Dragging a whole line and dragging its ends are both defensible. Two handles make the slope and the intercept independently reachable, which is what the skill is about. |
| Shading | The tap picks a SIDE, not a region to paint | Painting would need a flood fill and a tolerance for where the finger stopped. A side is what the mathematics asks for. |
| `h8.ee.c9` | Attached to Chapter 4 as well as Chapter 5 | Its registry entry lists both, and its tier 1 is a one-variable review, which is Chapter 4 work. |

## Still not delivered

- **Terrain tiles**, **04C Tanker refuel**, **Profile**, **Fleet**, **Unlock
  reveal**, and the **`/dad`** views. Unchanged from `docs/PHASE3-NOTES.md`.
- **Flight School lesson 1** still explains the stick rather than handing it over.
- There is no lesson anywhere that teaches the new inputs. A first-time tip on
  the first plot-point card would be the obvious place.
