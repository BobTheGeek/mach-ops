# Phase 10 notes

The pilot's own screens: who he is, what he has flown, and what every aircraft
in the fleet actually is.

## What landed

```
pnpm dev          # play it
pnpm test         # the full suite
pnpm build        # typecheck + production bundle
```

- **12 Pilot profile** — `src/game/scenes/ProfileScene.ts`. Rank insignia and
  callsign, the record (credits, streak, best streak, sorties, intel cards,
  airframes), and a paint-scheme picker per airframe with a live preview.
- **09B Fleet spec sheet** — `src/game/scenes/FleetScene.ts`. All eleven
  airframes down the left, locked ones greyed; length, span, height, crew,
  engines and top speed on the right, with the side view and a one-line note.
- **`src/data/fleet.ts`** — the figures themselves.
- Two new hangar buttons, FLEET and PILOT, and `setCallsign` / `setPaint` in
  `save.ts`.

## Every figure on the spec sheet is a real one

The numbers come from `design/accuracy-check.md`, which is the audit the
sprites were drawn against and which cites a USAF, NAVAIR, NASA or National
Museum fact sheet for each airframe. Nothing is filled in from memory.

Where that document gives no speed — the F-4E, A-10C, F-14, F-15C and F-117 —
`topSpeed` is `null` and the screen shows a dash. A missing figure is shown as
missing rather than guessed at, and `tests/data/fleet.test.ts` pins which five
those are so a later edit cannot quietly invent one.

The source line sits at the foot of the screen, because the figures are real
and he should be able to check them.

### A note that stopped being true

The A-10 card said it was "the only one here whose wings are wider than it is
long". The F-14's span is quoted unswept, at 19.5 m against a 19.1 m length, so
it is wider too. The note now says the A-10 is wider across the wings than it is
long without claiming to be alone in it, and the test asserts the set is exactly
those two.

## The unlock chain was still not being flown

Phase 9 wired the bosses up so passing one unlocks the next airframe. Every
scene that then asked which aircraft the pilot was in read
`unlockedAirframes[0]`, which is always the T-38. Unlocking ten more airframes
changed nothing: the sortie drew the trainer, the debrief filed the intel card
under the trainer, and the briefing header said T-38 in as many words.

`gameState.currentAirframe()` now answers that question once — the newest
airframe unlocked — and the sortie, the debrief, the dossier and the briefing
header all ask it. Flight school still names the T-38 outright, on purpose: the
trainer is what flight school is flown in, and it awards the first T-38 card.

The debrief's card code and its "all ten collected" line took the designation
from `src/data/fleet.ts` instead of the literal `T-38`.

Still on the trainer, and left that way: the hangar's per-chapter thumbnails and
the briefing's tactical-map marker. Both are 34–72 px decorations, and drawing
the right one there means rasterising ten more airframes for a screen that does
not need them.

## A texture reload blanked the sortie

Loading the flown airframe mid-sortie killed the whole screen with
`Cannot read properties of null (reading 'glTexture')`.

`loadSprites` removed a texture before adding it back. Textures live on the
game, not the scene, and `phase2Variants` ends with the three bogeys — which
are on screen and drawing when the sortie loads its airframe. Removing their
texture handed those live sprites a dead frame and the renderer threw on the
next tick.

A key always rasterises to the same picture, so `loadSprites` now skips anything
already loaded and never removes. That is also less work: the bogeys and the
trainer are rasterised once per page load instead of once per scene.

## The paint scheme reaches the cockpit

`setPaint` stores an airframe id against a livery id. The sortie resolves
`<airframe>-top-<livery>-flame`, falls back to the standard scheme, then to the
trainer, so a livery with no sprite is never a missing aircraft.

Two exist in the design: `t38-nasa` and `f18-blueangels`. Both were checked in
the browser, on the Profile preview and in a flown sortie.

## Verified in the browser

ego-browser, against `pnpm dev`, on a save with six airframes unlocked:

- Fleet list and spec sheet, arrow keys and clicks, locked rows greyed
- Profile: rank, callsign edit (typed, committed, reloaded, still there),
  record, both paint pickers
- A sortie flown in the F/A-18E in Blue Angels paint, terrain and bogeys intact

## Motion pass: the sortie did not read as flight

Four things were wrong at once, and each one hid the others.

**The aircraft never moved.** Turning changed a heading number and nothing else.
The sprite now rolls into the turn, up to 22 degrees, losing a fifth of its
wingspan as it goes over, and levels out again when the stick comes back. It is
a cue only: the flight model still holds the airframe on station and moves the
world around it.

**The ground ignored the aircraft.** It scrolled downward at a fixed 26 px/s
whatever the pilot did. Terrain now takes the same world delta the bogeys do, so
a turn swings the ground sideways. It is drawn four times, two wide by two tall,
so it wraps in both axes. The clouds take a larger share of that delta than the
ground does, and the gap between them is what reads as height.

**The bogeys arrived on their own schedule.** On top of the world motion, each
one marched down the screen at a speed the stick could not beat, so they swept
past whatever the pilot did and steering felt inert. They now drift at 10 to 20
px/s against the player's 190, and they wrap on both axes, so turning onto one
you missed brings you back to it.

**The turn was too fast to aim.** 140 degrees per second is a full circle in two
and a half seconds; a tap of the key swung the nose forty degrees. It is 75 now,
about five seconds round.

## The locked airframes were invisible

A locked row on the fleet spec sheet drew its silhouette at 0.35 alpha. The
silhouette export is near black and the panel behind it is near black, so the
panel read as empty. It is tinted to the muted text grey at 0.55 now, and the
shape he has not earned yet is clearly a shape.
