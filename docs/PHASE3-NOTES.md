# Phase 3 notes

"Feel" plus the Chapter 2 content sprint. Read alongside `docs/engine-rules.md`
"Build plan" row 3, and `docs/PHASE2-NOTES.md` for the two rulings still open.

## What landed

```
pnpm dev          # play it
pnpm test         # 373 tests, 34 files
pnpm build        # typecheck + production bundle
```

**Content**

- `ns.2.1` – `ns.2.5`: Chapter 2 generators, Flight Manual pages and the eight
  property tests each.
- The seven Q1 honors skills — `h8.ns.a1`, `h8.ns.a2`, `h8.ee.a1`, `h8.ee.a3`,
  `h8.ee.a4`, `h8.ee.c7a`, `h8.ee.c7b` — with their pages and tests. The five
  attached to Chapter 2 serve in Chapter 2 sorties now; `c7a` and `c7b` attach to
  Chapter 4 and will serve when it opens. Honors problems are badged HONORS on
  the card, in the briefing and in the manual library.
- `src/engine/quantity.ts`: square roots, multiples of pi, the repeating-decimal
  trick done exactly, and scientific notation. These are the things the honors
  skills need that a Rational cannot hold.
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

Four of the same class Phase 1 and 2 turned up, three caught by tests rather than
by reading the code:

1. **All three of `ns.2.1`'s error tags compute the same number** — the answer
   with the wrong sign. The first listed took the slot and `square-sign` and
   `count-negatives` never reached a player, which also means the engine never
   logged them. Each now owns the variant where it is the real mistake.
2. **`ns.2.3` drew a denominator and then a numerator, which is not the same as
   drawing a value.** Halves have one coprime numerator and twenty-fifths have
   twenty, so 1/2 came up as often as every twenty-fifth put together: 14.8% of
   every tier-1 draw was the same card. It now draws uniformly over the value
   space, which also took tier 1 from 43 distinct problems to 129.

3. **`h8.ns.a1` hashed only the repeating digits**, not the whole part or the
   non-repeating digit, so widening the problem space did nothing: every card
   with the same repeat collided into one hash and the no-repeat guard could not
   tell them apart. Found because the guard started logging that it had given up.
4. **The magnitude fallback padded written answers with trailing spaces.** The
   spec's fallback is "correct x2 or ±10", which means nothing for an answer like
   `x⁶` or `ONE SOLUTION`, so the card showed options that differed only by
   invisible whitespace. A written answer now yields a narrower option set rather
   than a fake one, and a card that ends up with fewer than two options becomes
   free entry instead.

The no-repeat guard now logs when it gives up, as GENERATOR_SPEC section 6 says
it should. That log is a content signal: it means a skill's registry ranges are
too narrow to keep a mission fresh. It fired for `h8.ns.a1`, whose foil lists are
now generated rather than hand-written (50 values became 264) and whose repeating
decimals gained a whole part and an optional non-repeating digit (9 became 1,117
at tier 2). Nothing else trips it.

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
| Honors repeating decimals | A whole part and an optional non-repeating digit are allowed | The registry fixes the number of *repeating* digits, not what sits in front of them, and the method is identical. Without it tier 2 had nine possible problems. |
| Slot distribution test | The spec's 20–30% band for four options over a full sweep; four standard deviations of the binomial for other widths | A tier that mixes variants produces mixed option counts, so a thin slice of one width needs a band that accounts for its sample size. |

## A registry inconsistency, since resolved

`h8.ee.c7a` and `h8.ee.c7b` carried `quarter: 1` while attached to `ch4`, which
`tokens.json` puts in quarter 2. Ruled quarter 2; see `docs/DECISIONS.md`. A test
now holds every honors skill's quarter to its chapter attachment.

## Still not delivered

- **Fonts.** Still expected at `public/fonts/`; see `docs/PHASE2-NOTES.md`.
- **Terrain tiles.** Still CSS swatches only; the sortie uses the sea grid.
- **04C Tanker refuel**, Profile (12), Fleet (09/09B), Unlock reveal (10), and
  the `/dad` views (14x, Phase 5).
- **Flight School lesson 1** still explains the stick rather than handing it
  over. Now that the flight model exists it can become real stick time.

## Rulings

All three open questions were decided on 2026-09-28 and are recorded in
`docs/DECISIONS.md`:

1. **Status thresholds** — fluency kept but shrunk to 10%. ONLINE now needs 8 of
   the last 10, or 9 of 10 at a slower pace. The old 50/30/20 blend let speed
   outrank accuracy: 10 of 10 correct but slow read CALIBRATING while 7 of 10
   fast read ONLINE.
2. **Ranks** — from mastered skills, not XP. No XP is modelled.
3. **`h8.ee.c7a` / `c7b`** — quarter 2, matching their chapter 4 attachment.
