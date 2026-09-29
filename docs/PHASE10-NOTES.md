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

### Forward is forward

The first pass at this kept the old model, where the world moved along a full
heading vector. That is correct for a map and wrong for a cockpit: at heading
180 the ground ran backwards up the screen and the aircraft appeared to fly in
reverse down its own track. Nothing an aircraft does looks like that.

The camera rides with the aircraft now. The world always comes at you at SPEED,
and the bank adds a sideways slide of up to 150 px/s. Turning moves you across
the world; it never moves you back along it. The heading on the HUD is a
compass READOUT, not the direction of travel, and it is the only place the turn
shows as a number.

## The kill had no weight

A right answer shot a bogey down and it simply vanished from the screen. That is
the one moment in a sortie that has earned some noise.

`splash()` in the sortie now puts a flash, an expanding ring and eight pieces of
debris where the bogey was, and shakes the camera for a sixth of a second. The
debris flies on a fixed ring of angles rather than a random scatter, so a
replayed sortie looks the same twice. Everything is tweened and destroys itself,
so a long sortie leaves nothing behind.

`bogeySplash` joins the other cues in `design/tokens.json` and is synthesised
like all of them: a crack, a debris burst, and a thud falling away underneath.
A Chromebook that downloaded no assets still hears the kill.

Reduced motion keeps the flash and the sound and drops the ring, the debris and
the shake.

## The locked airframes were invisible

A locked row on the fleet spec sheet drew its silhouette at 0.35 alpha. The
silhouette export is near black and the panel behind it is near black, so the
panel read as empty. It is tinted to the muted text grey at 0.55 now, and the
shape he has not earned yet is clearly a shape.

## The Khan Academy link went nowhere

Every manual page ends with `[Watch on Khan Academy](...)` and every page's front
matter carries the same URL. The panel renders markdown through `stripMd`, which
flattens a link to its text, so the line arrived on screen as the dead words
"Watch on Khan Academy" with nothing behind them.

`stripMd` now drops a line that is ONLY a link, because such a line cannot render
as text, and the URL is a real button instead.

The button sits in the panel footer, not in the scrolling body. A Phaser mask
hides pixels but not hit areas, so a button inside the body would stay clickable
after scrolling out of sight and would fire from a click on the header. The
footer also means he does not have to scroll to the bottom to find the lesson.

`openExternal` opens it in a new tab with `noopener,noreferrer`, from inside the
pointerup handler so the browser counts it as a user gesture rather than a popup.

Three tests pin the link: it is a khanacademy.org course URL on all 83 pages, the
front matter matches the markdown link on the same page, and the path is deep
enough to be a unit rather than the site root.

### These are unit links, not lesson links

All thirteen distinct URLs were checked and all thirteen return 200. They land on
the right Khan unit for the skill, one click from the lesson itself.

Going deeper was tried and not shipped. Khan renders its unit pages client-side,
so the lesson list only exists after JavaScript runs, and about half the lesson
slugs in the unit that was scraped carry an internal content id — for example
`x6b17ba59:adding-negative-numbers-fluently`. Those ids change when Khan
reorganises content, so lesson-level links would work today and rot silently,
and there would be 83 of them to keep alive. The unit links are stable.

## Every sortie stopped after three questions

Going to fly a boss end to end turned up the largest bug in the build so far.

A sortie builds a queue of `mission.problems` problems, and spawns
`mission.bogeys` contacts. A right answer shoots one down, and `destroyBogey`
ended the sortie as soon as the last contact died — whatever was left to ask.

Every mission in the game declares three bogeys. So every sortie asked three
questions and stopped, however many it advertised. The Chapter 2 boss says
twelve problems on the campaign screen and asked three.

The consequence is worse than a short sortie. An intel card wants six first-try
hits in one sortie, and the shortest mission declares six problems, so the
numbers were chosen to line up. But only three were ever served, so **no intel
card was reachable on any mission in the game**. That is why the pilot profile
read `INTEL CARDS 0` after nineteen sorties while it was being checked earlier
in this phase — the dossier had been unreachable the whole time.

Contacts are a stream now: shoot one down and, while problems remain, another
comes in from above on the next lane. The sortie ends when the queue is empty.

Three tests hold the arithmetic together: no mission may declare fewer problems
than bogeys, every boss must ask more than one pass of its bogeys, and every
mission must ask at least `FIRST_TRY_HITS_FOR_CARD` problems so a card stays
reachable.

### Flying it turned up a second fault

Streaming contacts exposed something the three-kill cap had been hiding. The
spawn lanes were fixed screen positions — 300, 640 and 980 — and the player
holds station at x 592 against a 340 px lock range. The right-hand lane is
388 px away: a contact there could never be locked at all. With only three kills
that rarely mattered; with twelve it stalled the sortie.

Lanes are offsets from the player's own column now, ±170 and centre, all inside
lock range. Every contact passes close enough to shoot at, and the stick is for
choosing which one rather than for finding them.

A hard turn could still push every live contact off to one side, where they wrap
and sit. A contact outside lock range now edges back toward the player's column
at 60 px/s, which reads as the bogeys hunting too and means a sortie can never
stall with nothing lockable.

### The whole chain, flown

The Chapter 2 boss was flown end to end in the browser: three prep problems and
all twelve sortie problems, each one locked, answered and confirmed from the
scene's own queue.

- The queue reported `0/12` through `11/12`. Before the fix it stopped at 3.
- `AIRFRAME UNLOCKED · PHANTOM II · F-4E` on the reveal screen.
- The save afterwards: `airframes=t38,f4`, `bosses=ch1,ch2`,
  `cards={"t38":[1,2]}`, credits 2000 → 4300, streak 23.
- **An intel card was earned.** Card 2 for the T-38, the first card the game has
  ever been able to award. It goes to the trainer because that is what the
  sortie was flown in; the F-4E arrives at the debrief, after the card.
- The next briefing header read `SORTIE 01 · FIRST LIGHT · F-4E`, and the sortie
  drew the Phantom.
