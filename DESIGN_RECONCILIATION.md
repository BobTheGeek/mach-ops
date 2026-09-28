# Design ↔ Content reconciliation

Read this alongside `GENERATOR_SPEC.md` and the design packet's `README.md`. Where the two disagreed, the decisions here stand (they are also recorded in the design doc under "Reconciled with the design handoff").

## 1. Counts to correct in the design packet

- `tokens.json → structure.subSkills` is 78 and `honorsSkills` is 24. Actual: **83 sub-skills, 54 core + 29 honors.** Set `subSkills: 83, honorsSkills: 29`. The /dad heat map (14C) and the manual library (M3) grow accordingly; layouts are row-based so nothing else changes.
- Design README "Files" table says 56 SVGs; the `svg/` folder has 63 (the README's own Assets section is right).

## 2. Registry `reps` → Math Kit components

Every representation named in the skill registry renders with one of the Math Kit sheet's components. Use these ids in the renderer; the registry strings stay as they are.

| Registry rep(s) | Math Kit component |
| --- | --- |
| number-line, vertical-number-line, zero-pairs, likelihood-line, powers-of-ten-line, bracketing | MK-1 Number lines (integer add/subtract arrows; inequality open/closed + shading; the vertical variant is MK-1 rotated) |
| coordinate-plane, coordinate-plane-two-lines, coordinate-plane-shaded, coordinate-plane-sketch, coordinate-plane-right-triangle, table-graph-equation, C-vs-d-graph, slope-triangle, dilation-pair, scatter-plot, scatter-plot-with-line | MK-2 Coordinate plane (points; proportional through origin; system two lines; scatter with draggable line of fit; shaded region per AI-5) |
| ratio-table, arrow-table, two-way-table, function table, data table, proportion-table, balance-table, frequency-table, debt-table, fact-family, outcome-table | MK-3 Tables (ratio; two-way frequency; function/throttle; data center-spread) |
| tape-diagram, tape-diagram-100, part-whole-bar, double-number-line, hanger-diagram, area-model, area-model-reverse, mapping-diagram, tiles | MK-4 Models (tape; double number line; hanger; area model; mapping) |
| tree-diagram, organized-list, sample-space-list, spinner, dice, simulation | MK-5 Probability (tree; organized list; spinner/dice) |
| dot-plot, quartile-marks, skew-vs-symmetric, box-plot, parallel-dot-plots, side-by-side-box-plots, dot-plot-of-sample-means, population-sample-diagram | MK-6 Statistics (dot plot; box plot five-number summary; two dot plots) — side-by-side box plots = two MK-6 box plots stacked |
| angle-diagram, transversal-diagram, circle-labelled, grid-decomposition, scale-drawing, scale-bar, grid, right-triangle-labelled, squares-on-sides, straws, compass-construction | MK-7 Geometry (angle pairs; parallel lines transversal; circle r/d; composite figure grid; scale drawing + scale bar; right triangle; cross section) |
| solids-labelled, net, can-label-net, layers-of-cubes, base-times-height, slice-visual, square-and-cube-models | MK-8 Solids and nets (prism, cylinder, pyramid, cone, sphere; net) |
| long-division, expanded-form, place-value-shift, algebra-trick-10x, hundred-grid, wedges-to-parallelogram, pour-demo, velocity-time, vertical-format, add-the-opposite, test-point, equation | **Not in the Math Kit.** These are Flight Manual illustrations, not problem figures: render as static SVG in the manual page's diagram slot using MK-0 math text style. Add to the design backlog if a problem ever needs them live |

## 3. Registry `formats` → Answer Input components

| Registry format | Component | Notes |
| --- | --- | --- |
| numeric | Problem card input (Component Library 02) + keypad when keypad entry is on | Default; accepts signed decimals, commas ignored |
| expression | Problem card input, expression mode | Canonicalize before compare (see spec §2); MK-0 rendering of the typed expression under the field |
| fraction | AI-1 Fraction input | Equivalent fractions accepted (6/8 = 3/4) |
| sci-notation | AI-2 Scientific notation input | Coefficient + exponent fields |
| plot-point | AI-3 Plot / drag a point | Snaps to grid; arrow keys move |
| drag-line | AI-4 Drag a line | Two handles, live slope/intercept readout; line of fit and y = mx + b |
| shade-region | AI-5 Shade region | Endpoint set → pick side; used for number-line inequalities and half-planes |
| multiple-choice, yes-no, pick-one:…, graph-select, shape-select, likelihood-select, box-plot-read | AI-6 Pick one of N | Options may be text, MK figures, or number-line positions; keys 1–N |
| order | AI-7 Reorder | Shuffled default; arrow keys reorder |
| table-fill | AI-8 Fill a table cell | Tab advances; used for ratio and function tables |
| number-line-select | AI-6 with MK-1 options, or AI-5 for shading | Registry keeps the name; renderer picks based on whether the answer is a point or a region |

## 4. Rules adopted from the design packet (engine must implement)

- Lock: no cost. Fast window = `tokens.motion.fastBonusRing.duration` (5000 ms). Fast correct ×1.5 credits, streak +1. Correct: base credits, streak +1.
- Wrong in sortie: shields −20%, lock breaks (`lockBreak` motion + audio), streak → 0, RETRY re-locks the same bogey; second wrong −20% again. Engine's two-wrongs-in-a-row cap then serves a tier-down with hint.
- Manual during lock: timer PAUSED, lock held, fast bonus forfeited, no shield cost.
- Fast-wrong: worked example pops in (M6); CONTINUE re-serves the same problem, no fast bonus.
- HINT: −50 credits and forfeits fast bonus in sorties; free in briefings.
- Briefing: untimed, wrong costs nothing; each correct prep fills fuel / shields / missiles per the card.
- Fuel drains with time; bingo warning at 90 s (04B); tanker = untimed unit-rate problem (04C) to refill.
- Shields 0 or fuel 0 → sortie ends, progress kept (07B).
- Status: OFFLINE = new, CALIBRATING = learning, ONLINE = fluent, OPTIMIZED = mastered with transfer.
- Chapters open on `schedule.json` date. Parent toggle "Allow early unlock on boss pass" enables the design's whichever-first rule. Parent toggle "Honors required for boss", default off.
- Ch 10 boss = Blackbird Qualification: every chapter and its honors sorties at ONLINE+, ×3 credits, pass 85% with one transfer per chapter.
- Intel cards earned per sortie, 10 per airframe. Ranks: 5 insignia, advance on total mastered skills.
- Unlock chain: t38 → f4 → a10 → f16 → f14 → f15 → f18 → f117 → f22 → f35 → sr71 (ids match `tokens.json → structure.airframes` and `svg/` filenames).

## 5. Asset conventions the build uses

- Sprites: load `svg/<id>-top.svg` as the sortie texture at 120 px; `-top-silhouette` for locked; `-side` for hangar/dossier; `-side-gear` for the hangar floor; `-side-silhouette` for next-unlock teasers. Liveries `t38-top-nasa`, `f18-top-blueangels` are paint-scheme purchases.
- Layer ids for animation: `airframe`, `canopy`, `control-surfaces` (children `flaperon`/`aileron`/`stab`/`rudder`/`elevon`), `flame`, `gear`, `markings`. Phaser: rasterize per state (flame on/off, gear up/down) at load rather than animating SVG at runtime.
- Bogeys `bogey1-3` are fictional; never swap in a real foreign type.
- Fonts self-hosted (OFL 1.1). Terrain: not delivered; use Kenney CC0 top-down tiles matched to the `Component Library` terrain swatches until custom tiles exist.
- Attribution copy from artboard 14E ships in Settings › Credits.

## 6. Open items for the build to raise back

- Whether AI-6 option rendering can host MK figures at 44 px targets on a 1280×720 card, or whether figure options need their own larger card variant.
- The manual diagram slot is 180 px tall; MK-2 planes and MK-8 solids may need the two-page manual layout (M1/M1B) rather than the single page.
