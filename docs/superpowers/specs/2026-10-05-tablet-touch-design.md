# Tablet Touch Support — Design

_Status: approved in brainstorming, 2026-10-05. Next step: implementation plan._

## Intent

Mach Ops should be playable start to finish on an iPad, with no hardware
keyboard and no network: fly a sortie, answer every problem, use the manual and
hints, name a pilot, and pause or quit — all by touch, online or offline. Same
game, same Vercel deployment; touch is a second input mode beside the keyboard,
and nothing about Chromebook or desktop play changes.

Success: a student handed an iPad can open the deployed URL, install it to the
home screen, and complete a full sortie in airplane mode without ever wondering
why a control or a sound is missing.

## Evidence — what breaks today

| Gap | Where |
|---|---|
| Sortie steering is A/D/arrows, lock is SPACE, pause is ESC; no pointer path at all | `src/game/scenes/SortieScene.ts:198-206` |
| Flight School uses the same keyboard scheme; `pick` steps accept only number keys, `type` steps only keystrokes | `src/game/scenes/FlightSchoolScene.ts:163-205` |
| Callsign entry listens on `window` keydown only, so no iOS keyboard can ever open | `src/game/ui/callsignPrompt.ts:100-116`, `src/game/scenes/ProfileScene.ts:171` |
| Flight Manual scrolls by wheel or arrow keys only | `src/game/ui/manualPanel.ts:264` |
| Problem-card MANUAL and HINT are keyboard shortcuts only (`M`, `H`) | `src/game/ui/problemCard.ts:483-484` |
| Status copy is desktop-shaped: `IN RANGE · SPACE TO LOCK`, `A D · STEER SPACE · LOCK …` | `src/game/scenes/SortieScene.ts:292, 440` |
| Browser shell has no touch hardening: basic viewport meta, no `touch-action`, no safe-area or gesture handling | `index.html:5`, `src/style.css:55-75` |
| Numeric keypad exists but is off by default and private to the problem card | `src/game/save.ts:26,177`, `src/game/ui/problemCard.ts:289-330` |
| No service worker, manifest, icons or favicon; the MP3s are fetched at runtime from `/audio`, so nothing survives a network drop | `vite.config.ts`, `index.html`, `src/game/music.ts:130-132` |

Incidental find, not ours to fix in this pass: How to Play's footer claims
`CLICK A BOGEY TO LOCK`, but SortieScene has no pointer handlers. The new LOCK
button covers the touch flow; the copy should be corrected (tap-a-bogey-to-lock
is a backlog candidate, not part of this design).

## Decisions already taken

- **On-screen buttons**, chosen over drag-to-fly, tilt, or edge zones: most
  discoverable for students, least change to the flight model.
- **Approach A — one reusable Phaser touch-control component** feeding the
  existing `turn` / `tryLock()` / `openPause()` paths. No input-service
  refactor.
- **Callsign and profile naming use the native iPad keyboard** through an
  invisible DOM input; desktop keeps its existing key handler.
- **Target is iPad Safari on a real device** (model to confirm; all current
  iPads pass the size math). The implementation is touch-generic, but Android
  tablets are not device-tested in this pass.
- **Landscape is the only gameplay orientation**; portrait gets a rotate
  overlay. The game keeps its fixed 1280×720 artboard and `Scale.FIT`
  letterboxing.
- **Offline is a full installable PWA**: a service worker precaches the whole
  game including music (~11.6 MB on first visit), and a manifest makes Add to
  Home Screen a proper standalone app. This is the immersive mode the shell
  work deliberately does not build as a fullscreen button.

## Constraints

- Repo rules: new literal values go into `design/tokens.json` first; pure logic
  is unit-testable in `tests/`; scene behavior is verified by typecheck, build
  and a browser pass (scenes are not unit-tested here); no server; one
  localStorage key; the Chromebook performance budget must not regress.
- iPad Safari cannot lock orientation, hides browser chrome dynamically, and
  enforces its own gesture and audio policies. The device pass is the arbiter;
  this spec marks what is expected, not what is proven.

## Architecture

### Touch mode

A new helper, `src/game/touch.ts`:

```ts
/** True on devices that report touch points. Guarded for vitest (no navigator). */
export function touchMode(): boolean;

/** Keyboard turn plus touch turn, clamped to -1/0/1. Pure; unit-tested. */
export function mergeTurn(keyboard: number, touch: number): number;
```

`touchMode()` is `typeof navigator !== "undefined" && navigator.maxTouchPoints > 0`.
An iPad with a Magic Keyboard still reports touch and shows the controls;
the keyboard keeps working alongside, which is harmless. No Settings toggle in
this pass.

### New — `src/game/ui/touchControls.ts`

One kit-styled component mounted by Sortie and Flight School:

```ts
export interface TouchControlsOpts {
  /** PAUSE is offered in the sortie, not in Flight School. */
  pause?: () => void;
  /** LOCK pressed. */
  lock: () => void;
  /** Hold-to-bank state changed; -1, 0 or +1. */
  onTurn(turn: number): void;
}
export function mountTouchControls(
  scene: Phaser.Scene,
  opts: TouchControlsOpts,
): { setLockable(v: boolean): void; setVisible(v: boolean): void; destroy(): void };
```

Layout, in canvas units (touch mode only, `SCREEN_PAD` = 32):

| Control | Rect (x, y, w×h) | Behaviour |
|---|---|---|
| Steer ◀ | (32, 592, 96×96) | Hold to bank left |
| Steer ▶ | (140, 592, 96×96) | Hold to bank right |
| LOCK | (1108, 592, 140×96) | Tap; calls `tryLock()` |
| PAUSE | (1192, 64, 56×56) | Tap; calls `openPause()` |

- Sizes are deliberate: 96 canvas px renders at ≈81 pt on a 10.2" iPad in
  landscape (FIT scale ≈ 0.84), comfortably above Apple's 44 pt minimum.
- `design/tokens.json` gains `hitTarget.touch` (96) and `hitTarget.touchWide`
  (140), exposed through `ui/tokens.ts`. PAUSE uses the existing `HIT.lg` (56).
- **Hold semantics**: pointerdown sets the direction, pointerup / pointerout /
  pointercancel clears it, so a finger that slides off a button stops banking.
  `scene.input.addPointer(2)` so both thumbs tracking separate buttons never
  fight over one pointer.
- **LOCK state**: when a contact is in range the button takes the accent colour,
  matching the live TGT readout — the game's existing teaching pattern (faded
  states are the tutorial). Out of range it stays muted; the status line already
  says `NO TARGET IN RANGE` when tapped anyway.
- **Visibility**: hidden while a problem card is up, during pause, and after the
  sortie ends — the same moments the keyboard is inert. `setVisible` is called
  from those transitions in the host scenes.
- **Touch-mode HUD nudges** (Sortie only): fuel/shield stack moves from
  y 610/654 to under the top-left readouts (y 64/108); missile pips move above
  LOCK (y ≈ 556, AIM label 534); the keyboard hint line is removed — the buttons
  are the hint. Exact positions confirmed on the device pass; all coordinates
  live in this one module so they are cheap to move.

Scene integration:

- `SortieScene`: `turn = mergeTurn(keyTurn, touchTurn)` where turn is computed
  today (`SortieScene.ts:386`). Status copy switches to `IN RANGE · TAP LOCK`
  in touch mode. `setLockable()` is fed from the existing `nearestBogey()`
  refresh.
- `FlightSchoolScene`: same component for `fly` and `lock` steps, mounted with
  `pause` omitted.

### Touch fixes elsewhere

1. **Flight Manual drag-scroll** (`ui/manualPanel.ts`): pointer drag on the
   panel body scrolls with the existing clamp; wheel and arrows stay. No
   inertia — predictable for students.
2. **Native keyboard naming** — new `src/game/ui/callsignInput.ts`:
   an invisible `<input>` (`autocapitalize="characters"`, `autocomplete="off"`,
   `spellcheck="false"`, `maxlength="12"`) focused on tap of the field; `input`
   events are filtered through the existing `isCallsignChar` and fed to the
   current drafting code. COMMIT / LATER buttons and the desktop `keydown` path
   are unchanged. Used by `callsignPrompt.ts` and `ProfileScene`'s editor on
   touch devices only.
3. **Numeric answers on touch**: `keypadEntry` defaults to `touchMode()` in
   `newSave()` (existing saves and the Settings toggle are untouched). The
   keypad is extracted from `problemCard.ts` into `ui/keypad.ts`
   (`buildKeypad(...) -> { container, height }`) and reused by Flight School
   `type` steps.
4. **Flight School completable by touch**: `pick` option rows become tappable
   (today number-key-only); step actions (`NEXT · ENTER`, `PICK B`, `TYPE 40`)
   become buttons, always clickable (mouse users gain the same affordance);
   keyboard shortcuts stay.
5. **The problem card gains a tappable COMMIT control**, and MANUAL and HINT
   become tappable too. `ENTER · COMMIT` is a label with no pointer path today,
   and pick/grid/order answers can only be submitted by keyboard — on a tablet
   the answer is unsubmittable. COMMIT is a 44 px kit button calling the
   existing `commit()` (whose guards already match Enter's), and MANUAL/HINT sit
   beside it with 44 px targets. `M` / `H` / Enter keep working.
6. **Copy**: touch variants for the sortie status line and hints; a Touch
   Controls page in How to Play (steer, lock, pause, answers, hint, manual);
   the Settings keypad note stops saying "Chromebooks only"; How to Play's
   lead stops saying "Keyboard first" absolutes.

### Browser shell — `index.html`, `src/style.css`, `src/main.ts`

- Viewport: `width=device-width, initial-scale=1, viewport-fit=cover,
  user-scalable=no, maximum-scale=1`.
- Meta: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`
  (`black-translucent`), `theme-color` (`#0a1018`), `mobile-web-app-capable` —
  so Add to Home Screen opens clean; normal browser play is unchanged.
- CSS: canvas gets `touch-action: none`, no text selection (`user-select`), no
  tap highlight, no touch callout; `html, body` are fixed with
  `overscroll-behavior: none` so pull-to-refresh and rubber-banding cannot
  interrupt play; `#game` takes `env(safe-area-inset-*)` padding so nothing
  sits under the home indicator.
- JS: `contextmenu` and iOS `gesturestart` are prevented on the game canvas;
  no other browser default is touched.
- **Rotate overlay**: a `<div id="rotate">ROTATE TO LANDSCAPE</div>` shown by the
  media query `(orientation: portrait) and (pointer: coarse)`; a matching
  `matchMedia` listener sleeps the game loop while it is up and wakes it on
  return, so a sortie cannot die behind the overlay. Portrait gameplay layouts
  are out of scope.
- No fullscreen button; Add to Home Screen covers immersive play.

### Offline — installable PWA

- **`vite-plugin-pwa`** (devDependency) with Workbox `generateSW` and
  `registerType: "autoUpdate"`. It precaches the full build: hashed `assets/`
  (JS + sprites), fonts, both HTML pages and the three MP3s, with
  `maximumFileSizeToCacheInBytes` raised above the largest track (3.2 MB).
  Navigation to `/` falls back to `index.html`; `/dad.html` is served from the
  precache as its own entry. Registration is included for both pages so the
  parent view works offline too.
- **Manifest**: `display: "standalone"`, `orientation: "landscape"`, scope and
  start at `/`, `theme_color`/`background_color` from tokens. Add to Home Screen
  gets the game full-screen with no Safari chrome, and where iPadOS honours the
  orientation hint it starts in landscape; the rotate overlay stays the
  backstop.
- **Icons**: no brand mark file exists — the wordmark is code-drawn
  (`TitleScene.ts:24`) and `design/svg/` is aircraft only. Produce a source icon
  from a top-down silhouette on the `ground` colour, export to `public/icons/`
  at 192, 512, 512 maskable and a 180 `apple-touch-icon`, and reference it from
  both HTML pages (neither has a favicon today). Bob can substitute a real mark
  at any time.
- **Vercel**: add `Cache-Control: no-cache` headers for `/sw.js`,
  `/manifest.webmanifest` and the registration script; the existing immutable
  rules for hashed `assets/` and `fonts/` stay. HTTPS is already in place, so
  the service worker has a secure context.
- **Update behaviour**: auto-update activates on the next launch; saves are
  localStorage and untouched by deploys. A deploy mid-session never reloads the
  page under the player.
- **Discoverability**: the How to Play touch page gains one line telling the
  student the game can be added to the home screen and then plays offline.
- **Testing offline** needs `pnpm build && pnpm preview` (the service worker is
  off in `vite dev` by default), then a real deploy for the iPad pass.

## Edge cases

- **iPad + hardware keyboard**: both inputs work; touch controls still show.
- **Hybrid touch laptops / touch Chromebooks**: controls appear because touch is
  reported; keyboard flows are unchanged.
- **Pointer hygiene**: pointercancel and pointerout clear held steering;
  controls hidden mid-hold clear state so no ghost turn survives a card or
  pause.
- **Naming**: the iOS keyboard resizes the visual viewport; the page is fixed,
  so the canvas re-centers rather than scrolling. If the device pass shows the
  prompt obscured, the entry's position is adjusted before commit. Focus is
  only ever taken on touch devices, so desktop text entry is unaffected.
- **Existing saves**: `keypadEntry` default changes only for new saves; the
  existing `load()` merge handles missing fields.
- **Reduced motion**: no new motion; pressed states are instant fills.
- **Audio**: unchanged; the first touch already resumes music (`main.ts:70`).
- **Rotation with controls held**: overlay hides and the loop sleeps; holds are
  cleared on hide.
- **iOS storage**: Safari may evict unused site data after roughly seven days;
  an installed home-screen app persists better, which is the recommended route.
  A first load must be online — precaching cannot precede the first visit.
- **Service workers per origin**: every Vercel preview URL gets its own service
  worker and cache; the device pass runs against production (or one fixed
  preview), and re-checks after a second deploy that the update path leaves the
  save alone.
- **Offline audio**: all three tracks are precached (~8.1 MB of the ~11.6 MB
  first visit), accepted for classroom use where the network may vanish
  mid-lesson.

## Testing

- Pure parts, `tests/game/`: `mergeTurn` matrix; hold-state reducer
  (down/up/out/cancel); callsign filtering reuses `isCallsignChar`; keypad
  extraction keeps existing problem-card tests green.
- `pnpm test`, `pnpm typecheck`, `pnpm build` all green on the branch.
- Desktop browser pass with responsive/touch emulation for layout before the
  device pass.
- **Real-iPad acceptance checklist** (the evidence attached to this spec, run on
  the Vercel preview):
  1. Sortie start to finish touch-only: steer both ways, lock, answer with the
     keypad, open MANUAL and take a HINT during a card, pause with the button,
     resume, quit to hangar.
  2. Flight School lessons complete touch-only, including a `pick` and a `type`
     step.
  3. First-launch naming commits a callsign via the native keyboard; Profile
     rename works the same way.
  4. Flight Manual pages scroll by drag.
  5. No page scroll, zoom, pull-to-refresh, long-press menu or text selection
     during play.
  6. Nothing renders under the home indicator; the letterbox stays centered.
  7. Portrait shows the rotate overlay and the game is paused; rotating back
     resumes cleanly.
  8. Keyboard routes on desktop/Chromebook are unaffected.
  9. Terrain scroll and card transitions show no perceptible jank on the test
     iPad.
  10. Music starts on first touch and cues still play after backgrounding and
      returning to Safari.
  11. Add to Home Screen installs with the correct icon and name and opens
      standalone, landscape if iPadOS honours the manifest hint and behind the
      rotate overlay otherwise.
  12. In airplane mode after the first visit, the game relaunches from the icon
      and the whole touch-only sortie list passes; music and cues play;
      `/dad.html` also loads and its CSV export works.
  13. After a redeploy, the next launch picks up the new version and the save is
      intact.
  14. Developer flow unchanged: `pnpm dev` runs without a service worker, and
      `pnpm test`, `pnpm typecheck`, `pnpm build` stay green.

## Risks / open items

- Test iPad model to confirm; it affects target-size math only, and all current
  models pass with margin.
- iOS keyboard behavior during naming is the least predictable surface; the
  device pass decides whether the fallback position adjustment is needed.
- Button coordinates and the HUD nudges may shift after the first real look;
  they are centralized in `touchControls.ts` for exactly that reason.
- How to Play's `CLICK A BOGEY TO LOCK` line is already inaccurate; this pass
  corrects the copy (implementing tap-to-lock is a backlog candidate).
- Safari's toolbar auto-hide can fire a resize mid-play; FIT should absorb it —
  verify no flicker on device.
- The app icon is the one new piece of art; generated candidates need sign-off
  before the manifest ships with them.
- iPadOS may ignore the manifest's orientation hint in standalone mode; the
  rotate overlay is the guarantee, so a landscape start is a bonus, not an
  acceptance bar.
- The first visit downloads ~11.6 MB; that is a one-time cost, and music
  precaching is the bulk of it.

## Out of scope

- Portrait gameplay layouts.
- Android tablet device testing (the implementation is touch-generic).
- A fullscreen button (the installable PWA is the immersive mode).
- Tablet-layout work for the `/dad.html` parent view — it is precached for
  offline, but not redesigned for touch.
- Gamepad support.
- Tap-a-bogey-to-lock and any gameplay, tuning or content change.
