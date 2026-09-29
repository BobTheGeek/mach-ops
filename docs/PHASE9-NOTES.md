# Phase 9 notes

Polish: ground under the sortie, the tanker, the unlock reveal, and a tip for
the new inputs.

## What landed

```
pnpm dev          # play it
pnpm test         # 83 generators, 10 campaigns
pnpm build        # typecheck + production bundle
```

- **Terrain** — `src/game/ui/terrain.ts`. Bands of sea, coast and desert with
  islands, dry lake beds and a cloud layer, scrolling past the aircraft.
- **04C Tanker refuel** — a tanker comes on station once per sortie, at bingo
  fuel, with an untimed rate problem. Getting it right buys fuel back.
- **10 Aircraft unlock reveal** — `src/game/scenes/UnlockScene.ts`, and the
  boss-pass logic that was missing behind it.
- **FT4** — a first-time tip on the first card answered ON the figure.

## The unlock chain was never wired up

`passBoss` and `unlockAirframe` had been in `save.ts` since Phase 2 and nothing
called them. Passing a boss did not record the boss, and no airframe was ever
unlocked — the hangar's chain was decoration.

It is wired now:

- `BOSS_UNLOCKS` in `src/data/campaign.ts` says which boss earns which airframe.
  A test holds it against the boss briefs, because a brief that promises the
  F-14 and a build that hands over the F-15 is a promise broken to a
  twelve-year-old.
- Chapter 1's boss earns nothing: the T-38 is already flying.
- The SR-71 is not a boss drop. `design/README.md` makes the Blackbird a reward
  for finishing the year, so it arrives when every CORE skill is ONLINE — honors
  skills are excluded, because the same document says honors work is never
  required for an unlock unless the parent turns that on.
- "Passing" a boss is flying it to the end. The design says failure keeps every
  bit of progress, so running out of fuel is not a pass, and nothing in the
  rulebook sets a score to beat.

## Terrain

The design ships terrain SWATCHES and says outright that tileable textures were
not delivered, so the ground is drawn rather than tiled.

The shape is computed into arrays BEFORE anything is drawn, because the strip is
drawn twice — one screen and its repeat — and the two copies have to be
identical. Drawing straight from the rng gave the top and bottom halves
different coastlines, and the wrap showed as a jump every twenty-odd seconds.

It is seeded on the mission id, so the same sortie always flies over the same
coastline. A player who flies a mission twice should recognise it.

## Bugs this phase found

1. **The terrain wrap jumped**, as above.
2. **One band swallowed the screen.** A desert filling 600 px reads as a
   background colour rather than as ground going past. Bands are capped at 38%
   of the screen.
3. **Two banners on the same line.** The tanker's banner landed on top of the
   bingo warning. The bingo panel steps aside while the tanker is on station,
   and comes back if the refuel is missed.
4. **A tip on top of the card it explained.** The first draft gave the tanker a
   first-time tip, and the tip box covered the card's own footer. The rule went
   into the banner instead — one line, no overlap, same information.
5. **The reveal's hero was small** in a panel built for it.

## A development affordance

`?card=<skill>&tier=<n>` (dev only) serves one skill in a briefing's prep. It
was added in Phase 8 and earned its keep again here.

## Assumptions to confirm

| Area | Assumption | Why |
| --- | --- | --- |
| Boss pass | Flying a boss to the end is a pass | Nothing in the rulebook sets a score. Failure already keeps progress, so the only thing left to distinguish is whether the sortie finished. |
| Blackbird | Unlocks when every core skill is ONLINE | `design/README.md` says "all 10 chapters must be ONLINE to launch" the Ch 10 boss; this build treats that as the unlock condition for the aircraft rather than a launch gate, because gating the last boss behind it would make the capstone unreachable for a player who is one skill short. |
| Tanker | One per sortie, at bingo, 120 seconds back | The design says "untimed rate problem" and nothing else. At bingo it is a rescue; earlier it would be free fuel. |
| Terrain speed | 26 px per second | Fast enough to read as motion, slow enough not to pull the eye off the HUD. Nothing in the design fixes it. |

## Still not delivered

- **Profile**, **Fleet**, and the **`/dad`** views.
- **Flight School lesson 1** still explains the stick rather than handing it
  over.
- Terrain is procedural geometry, not the tileable textures the design asks for.
  It reads as ground; it is not art.
