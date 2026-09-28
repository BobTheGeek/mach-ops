# Phase 3 notes

"Feel" plus the Chapter 2 content sprint. Read alongside `docs/engine-rules.md`
"Build plan" row 3, and `docs/PHASE2-NOTES.md` for the two rulings still open.

## What landed

```
pnpm dev          # play it
pnpm test         # 299 tests, 26 files
pnpm build        # typecheck + production bundle
```

**Content**

- `ns.2.1` – `ns.2.5`: Chapter 2 generators, Flight Manual pages and the eight
  property tests each.
- Exact repeating decimals in `src/engine/rational.ts` — long division with
  remainder tracking, a vinculum over the repetend — which `ns.2.3` is built on.
- A ten-sortie Chapter 2 campaign ending in the Phantom Qualification.

**Feel**

| Thing | Where | Notes |
| --- | --- | --- |
| Audio | `src/game/audio.ts` | All 21 cues from `tokens.audio.cues`, synthesised. No asset files, so a Chromebook that has not downloaded anything still gets sound. |
| Ducking | `AudioEngine.setDucked` | World audio drops 50% under bullet-time, per `tokens.audio.notes`. |
| Shield drain | `SortieScene.drainShields` | Animates over `tokens.motion.shieldDrain`. A bar that snaps reads as a glitch; a bar that drains reads as damage. |
| Lock break | `SortieScene.breakLock` | Reticle scatters over `tokens.motion.lockBreak`. |
| Streak tick | `SortieScene.streakTick` | Counter pops; the cue steps up a semitone per streak, capped at 12. |
| Systems panel | `src/game/systems.ts`, hangar strip | The four systems from FS4, read live from the save. |
| First-time tips | `src/game/ui/firstTimeTip.ts` | FT1 transfer, FT2 boss briefing, FT3 fast-wrong. Silent by design; each shown once. |
| Settings | `SettingsScene` (13B) | Volume, answer entry, colorblind HUD, reduced motion, reset tips, replay Flight School. |
| Flight model | `SortieScene.fly` | A D or arrows steer; the player holds the centre and the world rotates around them. Lock now needs a target inside range. |

Reduced motion is honoured by the hit flash, shield drain, streak tick, lock
break and the first-time tips, and leaves the bullet-time dim alone — exactly
what `docs/design.md` section 7 asks for.

## Bugs this phase found

Two of the same class Phase 1 and 2 turned up, both caught by the "every registry
tag is used" test rather than by reading the code:

1. **All three of `ns.2.1`'s error tags compute the same number** — the answer
   with the wrong sign. The first listed took the slot and `square-sign` and
   `count-negatives` never reached a player, which also means the engine never
   logged them. Each now owns the variant where it is the real mistake.
2. **`ns.2.3` drew a denominator and then a numerator, which is not the same as
   drawing a value.** Halves have one coprime numerator and twenty-fifths have
   twenty, so 1/2 came up as often as every twenty-fifth put together: 14.8% of
   every tier-1 draw was the same card. It now draws uniformly over the value
   space, which also took tier 1 from 43 distinct problems to 129.

Also found by playing it: locking had no range limit and no way to see where a
target was, so SPACE either worked or silently did nothing. The HUD gained a TGT
range readout in nautical miles, out-of-range bogeys dim, and the centre status
says IN RANGE or NO TARGET IN RANGE.

## Assumptions to confirm

| Area | Assumption | Why |
| --- | --- | --- |
| Systems mapping | RADAR ← `ns.*`, ENGINES ← `ee.*`, AVIONICS ← `rp.*` `pc.*`, WEAPONS ← `sp.* pr.* g.* h8.f.*` | FS4 names the four systems and says "one per skill group" but never says which group. |
| System status | A system reads at the weakest skill that has been *seen*; unseen skills do not drag it down | Otherwise nothing leaves OFFLINE until the whole curriculum is finished. |
| Flight model | Arcade: fixed speed, 140°/s turn, the world rotates around a centred player | The packet specifies the HUD and the lock rules, not a flight model. |
| Lock range | 340 px, and 60 px reads as 1 NM on the TGT readout | The artboards show "3.0 NM" style ranges but no screen scale. |
| Audio | Every cue synthesised from its `tokens.audio` description | The tokens describe each sound in words ("rising two-tone 440→880 Hz, 180 ms"); those descriptions are the spec and the code follows them literally. |

## Still not delivered

- **Q1 honors skills.** `GENERATOR_SPEC.md` section 10 puts `h8.ns.*`,
  `h8.ee.a*` and `h8.ee.c7*` after Chapter 2. Seven generators and seven manual
  pages, not yet written. This is the remaining half of the Phase 3 content row.
- **Fonts.** Still expected at `public/fonts/`; see `docs/PHASE2-NOTES.md`.
- **Terrain tiles.** Still CSS swatches only; the sortie uses the sea grid.
- **04C Tanker refuel**, Profile (12), Fleet (09/09B), Unlock reveal (10), and
  the `/dad` views (14x, Phase 5).
- **Flight School lesson 1** still explains the stick rather than handing it
  over. Now that the flight model exists it can become real stick time.

## Two rulings still open

Unchanged from `docs/PHASE2-NOTES.md`, and both still need a decision:

1. **Status thresholds.** The HP5 card states the engine's real rule (weighted
   score, bands at 0.60 and 0.85); the artboard says "70% first-try".
2. **Ranks.** The build uses mastered skills per `DESIGN_RECONCILIATION.md`
   section 4; two artboards say XP. There is no XP in the game.
