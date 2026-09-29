# Phase 7 notes

Chapters 9 and 10: geometry, solids, and the end of the school year.

## What landed

```
pnpm dev          # play it
pnpm test         # 71 generators, 10 campaigns
pnpm build        # typecheck + production bundle
```

- **Chapter 9, Geometric Shapes and Angles** — `g.9.1` – `g.9.5`, ten sorties
  ending in the Raptor Qualification.
- **Chapter 10, Surface Area and Volume** — `g.10.1` – `g.10.6`, ten sorties
  ending in the Blackbird Qualification, which is the whole year's review.
- **Six Q4 honors skills** — `h8.ee.a2` (roots), `h8.g.a2` (transversals),
  `h8.g.b3`, `h8.g.b4` and `h8.g.b5` (Pythagoras, three ways), and `h8.g.c6`
  (cones, cylinders and spheres).
- Every one with a Flight Manual page and the eight property tests.

**71 of the 83 skills** now have generators, pages and tests. Every chapter of
the year has a campaign.

## A new engine module

`src/engine/geometry.ts` — circles, triangles, prisms, pyramids, cylinders,
cones, spheres, angle pairs and cross-sections.

Two decisions in it are worth stating.

**π.** The registry lets a card ask for either form: "use π = 3.14" or "leave it
in terms of π". Rather than carry a tolerance, 3.14 is treated as the exact
rational 157/50, so a decimal answer is exact arithmetic like every other answer
in this engine. An exact-form answer carries the COEFFICIENT of π as its Rational
and writes itself as "25π"; those cards are always multiple-choice, because a
keypad cannot type a Greek letter.

**Roots.** Most lengths here come from Pythagorean triples and are whole. Where
they are not, the card says "to the nearest tenth" and the answer is the rounded
value — stated in the prompt, so the rounding is part of the question rather
than a loss of precision behind the player's back.

## Six new Math Kit figures

| Figure | What it is for |
| --- | --- |
| `circle-labelled` (MK-7) | The radius or the diameter DRAWN as well as labelled, so the player can see which one they were given. |
| `angle-diagram` (MK-7) | Rays from a point with arcs marking the named angles. |
| `transversal-diagram` (MK-7) | Two parallel lines, a leaning third, parallel arrows, and eight labelled positions. |
| `right-triangle-labelled` / `squares-on-sides` (MK-7) | A right triangle to scale with the right-angle square drawn, and optionally the squares on its sides. |
| `grid-decomposition` (MK-7) | A composite figure built from rectangles on a grid. |
| `solids-labelled` / `net` (MK-8) | A flat isometric solid with its measurements marked, or the same solid unfolded. |

## Bugs this phase found

1. **A generator that rejected its own answer.** `acceptPi` compared the answer
   as text, and the card hands its answer over as a Rational — so every
   exact-π card failed the harness's first property. It recognises the object
   form now.
2. **A hash that counted one card as two.** `g.9.1` folded "in terms of π or with
   3.14" into its key even for the conversion variant, where the answer is a
   plain length and the choice changes nothing. Coverage looked 50% better than
   it was.
3. **A net that drew two faces on top of each other.** `g.10.1` put the row of
   side faces at y = H and the top face at y = 0 with height W; whenever W was
   bigger than H they overlapped. The row sits below the top face now.
4. **A figure that disagreed with its prompt.** `g.9.3`'s "area between two
   shapes" says a CIRCLE sits inside the rectangle, and the grid renderer draws
   rectangles. It shows the outer shape only.
5. **Impossible options.** Negative angles from `g.9.5` ("−33°"), angles over
   180 from `h8.g.a2` ("238°"), and negative lengths elsewhere. Every recipe in
   these chapters is guarded, and where the guards left too few, the drawn
   values were raised so the spec's own "correct − 10" fallback cannot go
   negative either.
6. **A transversal card with four options and only two real angles.** A figure
   with two parallel lines contains exactly TWO angle values, so any third
   option is not an angle in the picture. Those cards are a choice between the
   two, except the equation variant where x is a real thing to be caught
   answering with.
7. **A tier that always gave the same answer.** `h8.g.a2`'s two-step chain
   resolved to the angle you started with every time. It now lands on the other
   value whichever way the first hop went.
8. **Yes/no and pick-one cards that were not coin flips.** `g.9.4` drew its
   three kinds of side-triple evenly, making "no" right two times in three;
   `h8.g.a2` drew its four named pairs evenly, and three of them are equal
   pairs, making "the same as the angle you were given" right three times in
   four. Both are balanced, measured over 12,000 draws.
9. **Questions with no defensible answer.** `g.9.2` asked for the area from a
   radius up to 40 in whole numbers — forty cards for a skill asked four ways.
   Several skills were widened within the registry's own ranges (halves for
   radii, the full 2..20 for pyramid edges, signed offsets on the coordinate
   grid) after the first coverage measurement.

## Two skills whose space is a fact set, not a range

`g.10.6` (cross sections) and `h8.ee.a2` (roots) do not have a parameter range.
The registry lists five solids and two slice directions; it lists the perfect
squares to 225 and the cubes to 1,000. Four prisms times one direction IS four
tier-1 cards, and fifteen squares asked two ways IS thirty. Their tests declare
the whole space as the floor rather than a sample of it, and their `maxShare`
ceilings are set accordingly. `h8.g.b4` is nearly the same: ten triples at eight
scales.

## Three interface bugs the new content exposed

1. **Net faces labelled through their own edges.** A net drawn to a solid's real
   proportions has thin faces, and a 13 px word laid across a 20 px face sits on
   both of its borders. A label only goes in a face with room for it.
2. Same class as earlier phases and already fixed: long options wrap, and the
   card header is squeezed clear of the timer.
3. The figure column is skipped entirely for figure kinds with no renderer, so
   the several MK-0 illustration kinds in these chapters (`wedges-to-parallelogram`,
   `pour-demo`) leave no empty box.

## Assumptions to confirm

| Area | Assumption | Why |
| --- | --- | --- |
| π form | An exact-π answer is always offered as a choice, never as a typed box | A keypad cannot type π, and accepting a decimal for an exact-form question would defeat the point of asking for it. |
| 3.14 | π = 3.14 is treated as exactly 157/50 | The registry's own value. Treating it as exact removes the tolerance the registry otherwise asks for, and no card mixes the two forms. |
| Rounding | A non-whole length is rounded to the tenth and the card says so | The registry asks for "non-integer results to the tenth" without saying where the rounding is stated. Stating it in the prompt is the only honest place. |
| Cube slices | A cube sliced either way is a square | Not in the registry, which does not list the cube. It was added to widen a four-card tier, and the geometry is not in doubt. |
| Boss unlocks | Chapter 9 earns the F-22A, Chapter 10 the F-35A | `design/README.md` fixes the chain order. The SR-71 sits at the end of it and stays locked: the design says the Blackbird needs all ten chapters ONLINE, which is a progression rule rather than a boss reward. |

## Still not delivered

- **Twelve skills**: the eleven Q2 honors skills attached to Chapter 5, and
  `h8.sp.a2` (line of fit). Every one of them needs an INTERACTIVE INPUT rather
  than a generator — plotting a point, dragging a line, filling a table cell.
  That is one piece of work, not twelve, and it is the last piece of content.
- **`h8.ee.c9`** (graph a linear inequality). Same category: it needs a
  shade-region input.
- **Terrain tiles**, **04C Tanker refuel**, **Profile**, **Fleet**, **Unlock
  reveal**, and the **`/dad`** views. Unchanged from `docs/PHASE3-NOTES.md`.
- **Flight School lesson 1** still explains the stick rather than handing it over.
