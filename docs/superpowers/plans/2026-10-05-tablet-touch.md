# Tablet Touch Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Mach Ops fully playable on an iPad in Safari with no hardware keyboard and no network — on-screen flight controls, touch-complete menus and answers, a browser shell that stops fighting the game, and an installable offline PWA.

**Architecture:** One reusable Phaser touch-control component feeds each scene's existing `turn` / `tryLock()` / `openPause()` paths, so no flight logic changes. Pure input helpers live in `src/game/touch.ts`; the numeric keypad is extracted from the problem card into `src/game/ui/keypad.ts`; naming uses a hidden DOM input to raise the iOS keyboard; the shell is hardened in `index.html`/`style.css`/`main.ts`; offline is `vite-plugin-pwa` precaching the whole build including music.

**Tech Stack:** Phaser 3.90, TypeScript 5.5 (strict, `noUnusedLocals`), Vite 5, Vitest, `vite-plugin-pwa` + Workbox, `sharp` (icon script only, devDependency).

**Spec:** `docs/superpowers/specs/2026-10-05-tablet-touch-design.md` — the plan argues from the spec; read both.

## Global Constraints

- The game keeps its fixed 1280×720 artboard and `Scale.FIT`; portrait gets the rotate overlay, never a second layout.
- Tokens first: new literals go into `design/tokens.json` and are read through `src/ui/tokens.ts` (`HIT = raw.hitTarget`, so new keys surface automatically).
- Touch is **additive**: every existing keyboard route stays, all existing tests stay green, and Chromebook play is unchanged.
- Exact control rects in canvas units: steer ◀ `(32, 592, 96×96)`, steer ▶ `(140, 592, 96×96)`, LOCK `(1108, 592, 140×96)`, PAUSE `(1192, 64, 56×56)`. New token values: `hitTarget.touch = 96`, `hitTarget.touchWide = 140`.
- Touch mode is `navigator.maxTouchPoints > 0`, guarded so vitest (node) sees `false`.
- Scenes are not unit-tested in this repo; scene tasks are verified by `pnpm typecheck` + `pnpm build` + a browser pass. The real device appears only in Task 13.
- PWA precaches the full build including the three MP3s (~11.6 MB first visit); `display: standalone`, `orientation: landscape`; both `/` and `/dad.html` work offline.
- No server; one save key; the save shape is unchanged apart from the `newSave()` keypad default.
- Commit after every task with a conventional message (`feat(touch): …`, `feat(pwa): …`).

## Review Focus

1. **Held steering with a second finger on LOCK** — both must work at once, and no ghost turn may survive a card, pause or release. Pinned: Task 1 hold tests; Task 2 `input.addPointer(2)` and scene-level release failsafe; Task 3 browser check.
2. **Pointer slides off / cancels / rotation mid-hold** — a held button must clear rather than stick. Pinned: Task 1 `release-all` test; Task 2 out/cancel handlers; Task 13 item 7.
3. **Native-keyboard naming** — focus/blur ordering must not eat COMMIT, and the desktop key handler must be untouched. Pinned: Task 9 browser check; Task 13 item 3.
4. **Service worker deploy/update** — a new deploy lands on next launch without touching the save, and each preview origin has its own cache. Pinned: Task 12 preview check; Task 13 items 12–13.
5. **iPad FIT + safe area** — buttons ≥44 pt, nothing under the home indicator, no page scroll/zoom/pull-to-refresh. Pinned: Task 11 CSS checks; Task 13 items 5–6.
6. **Offline audio** — all three tracks precached, not just the shell. Pinned: Task 12 glob/limit check; Task 13 item 12.

---

### Task 1: Touch helpers and tokens

**Files:**
- Modify: `design/tokens.json` (the `hitTarget` block at ~line 167)
- Create: `src/game/touch.ts`
- Test: `tests/game/touch.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (later tasks use these exact names):
  - `touchMode(): boolean`
  - `mergeTurn(keyboard: number, touch: number): -1 | 0 | 1`
  - `interface HoldState { left: boolean; right: boolean }`
  - `NO_HOLD: HoldState` = `{ left: false, right: false }`
  - `type HoldEvent = "left-down" | "left-up" | "right-down" | "right-up" | "release-all"`
  - `applyHold(state: HoldState, event: HoldEvent): HoldState`
  - `holdTurn(state: HoldState): -1 | 0 | 1`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { touchMode, mergeTurn, applyHold, holdTurn, NO_HOLD } from "../../src/game/touch";

afterEach(() => vi.unstubAllGlobals());

describe("touchMode", () => {
  it("is true when the device reports touch points", () => {
    vi.stubGlobal("navigator", { maxTouchPoints: 2 });
    expect(touchMode()).toBe(true);
  });
  it("is false on a mouse-only device", () => {
    vi.stubGlobal("navigator", { maxTouchPoints: 0 });
    expect(touchMode()).toBe(false);
  });
  it("is false when there is no navigator at all", () => {
    vi.stubGlobal("navigator", undefined);
    expect(touchMode()).toBe(false);
  });
});

describe("mergeTurn", () => {
  it("adds keyboard and touch", () => {
    expect(mergeTurn(1, 0)).toBe(1);
    expect(mergeTurn(-1, 0)).toBe(-1);
    expect(mergeTurn(0, 1)).toBe(1);
    expect(mergeTurn(0, -1)).toBe(-1);
    expect(mergeTurn(0, 0)).toBe(0);
  });
  it("clamps opposing inputs to level flight", () => {
    expect(mergeTurn(1, -1)).toBe(0);
    expect(mergeTurn(-1, 1)).toBe(0);
  });
});

describe("applyHold", () => {
  it("sets and clears each side", () => {
    const left = applyHold(NO_HOLD, "left-down");
    expect(left).toEqual({ left: true, right: false });
    expect(applyHold(left, "left-up")).toEqual(NO_HOLD);
    const right = applyHold(NO_HOLD, "right-down");
    expect(right).toEqual({ left: false, right: true });
    expect(applyHold(right, "right-up")).toEqual(NO_HOLD);
  });
  it("holds both sides independently", () => {
    const both = applyHold(applyHold(NO_HOLD, "left-down"), "right-down");
    expect(holdTurn(both)).toBe(0);
    expect(applyHold(both, "left-up")).toEqual({ left: false, right: true });
  });
  it("release-all clears a stuck hold", () => {
    const both = applyHold(applyHold(NO_HOLD, "left-down"), "right-down");
    expect(applyHold(both, "release-all")).toEqual(NO_HOLD);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- tests/game/touch.test.ts`
Expected: FAIL — cannot resolve `../../src/game/touch`.

- [ ] **Step 3: Create `src/game/touch.ts`**

Signatures above. `touchMode` guards `typeof navigator !== "undefined" && navigator.maxTouchPoints > 0`. `mergeTurn` clamps the sum to `[-1, 1]`. `applyHold` switches on the event string (`release-all` returns `NO_HOLD`). `holdTurn` is `right && !left ? 1 : left && !right ? -1 : 0`.

- [ ] **Step 4: Add the tokens**

In `design/tokens.json`, extend the `hitTarget` object:

```json
"hitTarget": {
  "min": 44,
  "lg": 56,
  "touch": 96,
  "touchWide": 140
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm test -- tests/game/touch.test.ts && pnpm typecheck`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add design/tokens.json src/game/touch.ts tests/game/touch.test.ts
git commit -m "feat(touch): touch helpers and touch-target tokens"
```

---

### Task 2: Touch controls component

**Files:**
- Create: `src/game/ui/touchControls.ts`

**Interfaces:**
- Consumes: `applyHold`, `holdTurn`, `NO_HOLD`, `HoldState` from Task 1; `HIT`, `C`, `N`, `TEXT`, `TRACK`, `SIZE`, `SCREEN_PAD`, `hex`, `CANVAS` from `src/ui/tokens`; `button` from `./kit`.
- Produces (Task 3 and Task 4 use this exact name):
  - `interface TouchControlsOpts { onTurn(turn: -1 | 0 | 1): void; onLock(): void; onPause?(): void }`
  - `interface TouchControls { setLockable(v: boolean): void; setVisible(v: boolean): void; destroy(): void }`
  - `mountTouchControls(scene: Phaser.Scene, opts: TouchControlsOpts): TouchControls`

- [ ] **Step 1: Implement the component**

`src/game/ui/touchControls.ts`, kit-styled and hand-drawn (the kit's `button()` commits on `pointerup`, which is right for LOCK and PAUSE but wrong for hold-to-steer):

- A root `Phaser.GameObjects.Container` holding everything; `destroy()` destroys it.
- **Steer buttons** at the exact rects from the Global Constraints, 96×96, 12 px apart, fill `C.panelRaised` with a 1 px `C.border` stroke at rest and `C.hud` fill while pressed; a triangular chevron per side drawn with `Graphics` (do not rely on glyph fonts). Each has a `Zone` (`setOrigin(0,0).setInteractive({ useHandCursor: true })`) whose `pointerdown` applies `left-down`/`right-down`, and whose `pointerup`, `pointerout` and `pointerupoutside` apply the matching `-up`. Recompute `opts.onTurn(holdTurn(state))` after every state change and redraw.
- **Release failsafe**: on the scene, `scene.input.on("pointerup", …)` and `scene.input.on("gameout", …)` apply `release-all` and re-emit the turn, so a finger lifted anywhere can never leave a bank stuck.
- **LOCK**: `button(scene, { x: 1108, y: 592, width: 140, height: 96, label: "LOCK", variant: "secondary", onClick: opts.onLock })`; `setLockable(true)` switches it to `"primary"` (the accent), `false` back to `"secondary"`.
- **PAUSE** (only when `opts.onPause` is set): `button(scene, { x: 1192, y: 64, width: 56, height: 56, label: "II", variant: "ghost", onClick: opts.onPause })` — use a drawn two-bar glyph inside a `Graphics` if the font renders "II" poorly; the rect is the contract.
- `mountTouchControls` calls `scene.input.addPointer(2)` first, so two thumbs plus the mouse never fight over Phaser's default pointer pool.
- `setVisible(false)` must call `release-all` before hiding, so a hidden control cannot keep banking.

- [ ] **Step 2: Typecheck and build**

Run: `pnpm typecheck && pnpm build`
Expected: clean. The visual check lands in Task 3, where the component is first mounted; there is nothing on screen to check yet.

- [ ] **Step 3: Commit**

```bash
git add src/game/ui/touchControls.ts
git commit -m "feat(touch): on-screen steer, lock and pause controls"
```

---

### Task 3: Sortie uses the touch controls

**Files:**
- Modify: `src/game/scenes/SortieScene.ts` (`create` ~163, `hud` ~262, `fly` ~380, scan block ~427, `tryLock` ~542, `showProblem` ~648, `clearLock` ~960, `openPause` ~984)

**Interfaces:**
- Consumes: `mountTouchControls`, `TouchControls` (Task 2); `mergeTurn`, `touchMode` (Task 1).
- Produces: nothing other tasks import.

- [ ] **Step 1: Mount and merge**

- New fields: `private touch?: TouchControls;` and `private touchTurn: -1 | 0 | 1 = 0;`
- In `create()`, after `this.hud();`: mount with `onTurn: (t) => { this.touchTurn = t; }`, `onLock: () => this.tryLock()`, `onPause: () => this.openPause()` (only when `touchMode()`).
- In `fly()`: replace the local `turn` with `const turn = mergeTurn((down(this.keys.right) ? 1 : 0) - (down(this.keys.left) ? 1 : 0), this.touchTurn);`
- On the scene's `Phaser.Scenes.Events.RESUME` event, `this.touch?.setVisible(true)` (pause resumes never re-fire `create`).

- [ ] **Step 2: Visibility and lock state**

- `showProblem()`: `this.touch?.setVisible(false);` before building the card.
- `clearLock()`: `this.touch?.setVisible(true);`
- `openPause()`: `this.touch?.setVisible(false);` before `this.scene.pause()`.
- In the scan block, where `inRange` is computed: `this.touch?.setLockable(inRange);` and when `inRange && !this.locked`, set the status text to `touchMode() ? "IN RANGE · TAP LOCK" : "IN RANGE · SPACE TO LOCK"`. Also call `setLockable(false)` in the `else` branch (no live contacts).

- [ ] **Step 3: HUD nudges and hint**

In `hud()`, compute `const touch = touchMode();` then:
- fuel bar y: `touch ? 64 : CANVAS.height - 110`; shield bar y: `touch ? 108 : CANVAS.height - 66`
- missile pips y: `touch ? 556 : CANVAS.height - 66`; AIM label y: `touch ? 534 : CANVAS.height - 88`
- the keyboard hint line is only created when `!touch`.

- [ ] **Step 4: Typecheck, build, browser check**

Run: `pnpm typecheck && pnpm build`
Then `pnpm dev` with DevTools device mode (iPad): start a sortie, hold each steer button (bank starts and stops), tap LOCK with a contact in range (card opens, controls hide), tap PAUSE (menu opens, controls hidden), resume (controls return), and with a real mouse drag off a held button (turn clears). Keyboard still steers with A/D as before.

- [ ] **Step 5: Commit**

```bash
git add src/game/scenes/SortieScene.ts
git commit -m "feat(touch): fly the sortie with on-screen controls"
```

---

### Task 4: Flight School uses the touch controls

**Files:**
- Modify: `src/game/scenes/FlightSchoolScene.ts` (`create` ~163, `update` ~272, `render` ~388, `stepBogey` ~340)

**Interfaces:**
- Consumes: `mountTouchControls`, `TouchControls` (Task 2); `mergeTurn`, `touchMode` (Task 1).
- Produces: nothing other tasks import.

- [ ] **Step 1: Mount, merge, lock**

- New fields `private touch?: TouchControls;` and `private touchTurn: -1 | 0 | 1 = 0;`
- In `create()`: mount with `onTurn` and `onLock: () => this.trySchoolLock()`; no pause; start hidden.
- In `update()`:

```ts
const keyTurn = (down(this.keys?.right ?? []) ? 1 : 0) - (down(this.keys?.left ?? []) ? 1 : 0);
const turn = mergeTurn(keyTurn, this.touchTurn);
```
- In `render()`, after the step is known: `this.touch?.setVisible(step.kind === "fly" || step.kind === "lock");`
- In `stepBogey()`, the in-range status text becomes `touchMode() ? "IN RANGE · TAP LOCK" : "IN RANGE · SPACE TO LOCK"`.

- [ ] **Step 2: Typecheck, build, browser check**

Run: `pnpm typecheck && pnpm build`, then `pnpm dev` device mode: Lesson 1 fly step shows the controls and rings are catchable by holding steer; the lock step shows them and LOCK works in range; pick/type steps hide them; keyboard still flies.

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/FlightSchoolScene.ts
git commit -m "feat(touch): fly flight school with on-screen controls"
```

---

### Task 5: Shared numeric keypad, on by default for touch

**Files:**
- Create: `src/game/ui/keypad.ts`
- Modify: `src/game/ui/problemCard.ts` (keypad ~282-330), `src/game/save.ts` (`newSave` ~177), `src/game/scenes/FlightSchoolScene.ts` (`renderProblem` ~612)
- Test: `tests/game/keypad.test.ts`, `tests/game/save.test.ts` (additions)

**Interfaces:**
- Consumes: `touchMode` from `src/game/touch`.
- Produces:
  - `KEYPAD_ROWS: readonly (readonly string[])[]` — the existing rows `1 2 3 /`, `4 5 6 MINUS`, `7 8 9 .`, `⌫ 0 % ✓`
  - `applyKey(current: string, label: string): string` — `⌫` slices the last char, otherwise appends (the `✓` glyph is handled by the caller as commit and does not pass through)
  - `interface KeypadOpts { scene: Phaser.Scene; x: number; y: number; width: number; onKey(label: string): void; onCommit(): void }`
  - `buildKeypad(o: KeypadOpts): { container: Phaser.GameObjects.Container; height: number }`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from "vitest";
import { applyKey, KEYPAD_ROWS } from "../../src/game/ui/keypad";

describe("applyKey", () => {
  it("appends a digit", () => expect(applyKey("4", "0")).toBe("40"));
  it("appends a fraction, sign and percent", () => {
    expect(applyKey("3", "/")).toBe("3/");
    expect(applyKey("3/", "-")).toBe("3/-");
    expect(applyKey("25", "%")).toBe("25%");
  });
  it("backspaces", () => {
    expect(applyKey("40", "\u232B")).toBe("4");
    expect(applyKey("", "\u232B")).toBe("");
  });
});

describe("KEYPAD_ROWS", () => {
  it("keeps the four rows of four the card shipped", () => {
    expect(KEYPAD_ROWS).toHaveLength(4);
    for (const row of KEYPAD_ROWS) expect(row).toHaveLength(4);
  });
});
```

Add to `tests/game/save.test.ts`:

```ts
it("defaults the keypad on for a touch device", () => {
  expect(newSave(true).settings.keypadEntry).toBe(true);
});
it("defaults the keypad off without touch", () => {
  expect(newSave(false).settings.keypadEntry).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- tests/game/keypad.test.ts tests/game/save.test.ts`
Expected: FAIL — module not found; `newSave(true)` takes no argument.

- [ ] **Step 3: Extract the keypad**

Move the rows, drawing loop and `keypadPress` logic out of `problemCard.ts` into `src/game/ui/keypad.ts` with the signatures above. Keep the exact visuals: 44 px keys (`HIT.min`), 6 px gaps, `RADIUS.input`, hairline `C.border`, 18 px `TEXT.value` labels. Each zone's `pointerup` plays `keyTick` (the keypad owns the sound) and then calls `onKey(label)`; the `✓` key calls `onCommit()` instead. `applyKey` holds only the pure string logic.

- [ ] **Step 4: Rewire the problem card and the save default**

- `problemCard.ts` keeps `private get keypadOn(): boolean` and calls `buildKeypad` with:

```ts
onKey: (label) => { if (this.locked) return; this.typed = applyKey(this.typed, label); this.refreshTyped(); },
onCommit: () => this.commit(),
```

The keypad owns the `keyTick` sound (Step 3), so the card's `keypadPress` method is deleted rather than kept as a wrapper.
- `save.ts`: `export function newSave(touch: boolean = touchMode()): SaveFile` and inside, `settings: { … keypadEntry: touch, … }`. Existing callers need no change; `load()`'s fresh-merge keeps old saves' values.

- [ ] **Step 5: Keypad for Flight School type steps**

In `renderProblem`'s `else` branch (`type`), when `step.kind === "type" && gameState.file.settings.keypadEntry`, call `buildKeypad` under the input box and grow `cardH` accordingly. Its callbacks:

```ts
onKey: (label) => {
  if (this.answered) return;
  if (label === "\u232B") this.typed = applyKey(this.typed, label);
  else if (/^[0-9.]$/.test(label)) this.typed += label;
  this.render();
},
onCommit: () => this.commit(),
```

The digits-and-dot filter matches the current keydown filter, so the lesson accepts exactly what it accepted before.

- [ ] **Step 6: Run tests, typecheck, build, browser check**

Run: `pnpm test -- tests/game/keypad.test.ts tests/game/save.test.ts && pnpm typecheck && pnpm build`
Browser: with device-mode touch, a new save shows the keypad in sortie cards and in Flight School type steps; typing and committing works; with the setting off, the keypad hides.

- [ ] **Step 7: Commit**

```bash
git add src/game/ui/keypad.ts src/game/ui/problemCard.ts src/game/save.ts src/game/scenes/FlightSchoolScene.ts tests/game/keypad.test.ts tests/game/save.test.ts
git commit -m "feat(touch): shared answer keypad, default on for touch devices"
```

---

### Task 6: Flight School pick rows are tappable

**Files:**
- Modify: `src/game/scenes/FlightSchoolScene.ts` (`renderProblem` pick branch ~626, keydown handler ~195)

**Interfaces:**
- Consumes: existing `this.picked`, `this.render()`, `this.answered`.
- Produces: `private pickOption(i: number): void` used by both the key handler and the new zones.

- [ ] **Step 1: Implement**

- Extract the keydown body `if (i < (step.options?.length ?? 0)) { e.preventDefault(); this.picked = i; this.render(); }` into `private pickOption(i: number): void` and call it from both places.
- In the pick branch of `renderProblem`, give each row a `Zone` over its 56 px rect (`setOrigin(0,0).setInteractive({ useHandCursor: true })`), `pointerup` → `pickOption(i)`, guarded by `this.answered` so a finished row cannot be re-picked.
- No new work for step actions: the callout already commits through a kit `CHECK`/`NEXT` button (`renderCallout`, ~line 674), so pick rows are the only Flight School answer surface without a pointer path.

- [ ] **Step 2: Typecheck, build, browser check**

Run: `pnpm typecheck && pnpm build`, then device mode: in Lesson 3's pick step, tapping a row selects it exactly as pressing its number did; keyboard still works.

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/FlightSchoolScene.ts
git commit -m "feat(touch): tap flight school pick options"
```

---

### Task 7: Problem-card footer: COMMIT, MANUAL and HINT are tappable

**Files:**
- Modify: `src/game/ui/problemCard.ts` (footer ~205-210, key handler ~483)

**Interfaces:**
- Consumes: `opts.onManual`, `opts.onHint`, `button` from `./kit`, `HIT.min`, `PAD`, `CARD_W`.
- Produces: nothing other tasks import.

- [ ] **Step 1: Add the tappable COMMIT control**

The footer's `ENTER · COMMIT` text is a label with no pointer path, and pick/grid/order answers have no other submit affordance — on a tablet the answer cannot be submitted. Replace that label with a real control: `button(scene, { x: PAD, y, width: 150, height: HIT.min, label: "COMMIT", variant: "primary", onClick: () => this.commit() })`, added to the card container. Grow the footer height from `SIZE.label` to `HIT.min` in the card's height calculation so nothing overlaps. `commit()`'s existing guards (`locked`, empty typed, no pick, grid null) make a premature tap a no-op, exactly as Enter behaves today. Keyboard Enter stays; mouse users gain click-to-commit, matching Flight School's existing CHECK button.

- [ ] **Step 2: Make MANUAL and HINT tappable**

Two `Zone`s with `height: HIT.min` sit over the `MANUAL` and `HINT` phrases (positions derived from the footer text's x/width, at least 8 px from each other and clear of the COMMIT button), each `pointerup`-calling `opts.onManual()` / `opts.onHint()`. Added to the card container so they are destroyed with it; work while `this.locked` (mid-problem help), matching the `M`/`H` keys.

- [ ] **Step 3: Typecheck, build, browser check**

Run: `pnpm typecheck && pnpm build`, then in device mode: pick an option and tap COMMIT (submits); repeat for a typed answer with the keypad setting off and for a grid answer; tap COMMIT with nothing entered (no-op, like Enter); tap MANUAL and HINT (matching `M`/`H`); confirm Enter still commits and the card layout in sortie, tanker and briefing modes has no overlap.

- [ ] **Step 4: Commit**

```bash
git add src/game/ui/problemCard.ts
git commit -m "feat(touch): tap commit, manual and hint on the problem card"
```

---

### Task 8: Flight Manual drag-scrolls on touch

**Files:**
- Modify: `src/game/ui/manualPanel.ts` (`attachKeys` ~252, add a drag zone in `build`)

**Interfaces:**
- Consumes: existing `scrollBy(dy)`, `scrim`, `PANEL_W`, `CANVAS`.
- Produces: nothing other tasks import.

- [ ] **Step 1: Implement**

Add an interactive zone over the panel body area (`x: CANVAS.width - PANEL_W`, width `PANEL_W`, from below the header to above the footer), added after the frame so it sits above the scrim. Track `dragging`, `lastY`; on `pointerdown` record, on `pointermove` call `scrollBy(lastY - p.y)` and update `lastY`, on `pointerup` / `pointerupoutside` / `pointerout` clear. Do not close on a drag; the scrim's tap-to-close stays for taps outside the panel. Wheel and arrow keys stay untouched.

- [ ] **Step 2: Typecheck, build, browser check**

Run: `pnpm typecheck && pnpm build`, then device mode: open a manual from the hangar, drag up and down (page scrolls, clamp respected, no close), tap the scrim (closes), keyboard `M`/`Esc` still work.

- [ ] **Step 3: Commit**

```bash
git add src/game/ui/manualPanel.ts
git commit -m "feat(touch): drag-scroll the flight manual"
```

---

### Task 9: Native-keyboard callsign entry

**Files:**
- Create: `src/game/ui/callsignInput.ts`
- Modify: `src/game/ui/callsignPrompt.ts` (entry ~77-116), `src/game/scenes/ProfileScene.ts` (`startEdit`/`commitEdit`/`cancelEdit` ~147-196)

**Interfaces:**
- Consumes: `isCallsignChar`, `MAX_CALLSIGN` from `src/game/save`; `touchMode` from `src/game/touch`; `audio.play("keyTick")` via the caller.
- Produces:
  - `interface NativeEntryOpts { initial: string; onDraft(draft: string): void; onCommit(draft: string): void; onCancel(): void }`
  - `attachNativeEntry(o: NativeEntryOpts): { focus(): void; destroy(): void }`

- [ ] **Step 1: Implement the helper**

`attachNativeEntry` creates a single `<input type="text">`, appends it to `document.body`, and styles it `position: fixed; opacity: 0; width: 1px; height: 1px; border: 0; padding: 0; font-size: 16px;` (never `display: none` — iOS refuses to focus that). Attributes: `autocapitalize="characters"`, `autocomplete="off"`, `autocorrect="off"`, `spellcheck="false"`, `enterkeyhint="done"`, `maxlength` set to `MAX_CALLSIGN`. Its `input` event filters each char through `isCallsignChar`, uppercases and caps at `MAX_CALLSIGN`, writes the filtered value back to the element and calls `onDraft`. `keydown` Enter → `onCommit(draft)`; Escape → `onCancel()`. `blur` deliberately does **not** cancel (tapping COMMIT blurs the field first on touch); `destroy()` removes the listener and the element.

- [ ] **Step 2: Wire the title prompt**

In `callsignPrompt.ts`, on touch only (`touchMode()`): create the entry when the prompt opens, add a `Zone` over the callsign line (full card width, `HIT.min` tall) whose `pointerup` calls `entry.focus()`, feed its draft into the same `draft`/`drawEntry` path the keyboard handler uses, and treat its Enter as `commit()` and Escape as `close(false)`. The COMMIT and LATER buttons are unchanged. Desktop keeps the existing `window` keydown path and never focuses the input.

- [ ] **Step 3: Wire the profile editor**

In `ProfileScene.startEdit()`, on touch: create the entry, call `focus()` immediately (the tap on CHANGE CALLSIGN is the user gesture), route `onDraft` to `this.draft` + the callsign text/caret redraw, `onCommit` to `commitEdit()`, `onCancel` to `cancelEdit()`. `cancelEdit()` destroys the entry. Desktop path unchanged.

- [ ] **Step 4: Typecheck, build, browser check**

Run: `pnpm typecheck && pnpm build`. Desktop device-mode emulation cannot raise a real iOS keyboard, but it can prove the wiring: tapping the field focuses the input, typed characters appear in the game's field with capitals and the 12-char cap, Enter commits, and on desktop the old keydown flow still works. The real keyboard is Task 13 item 3.

- [ ] **Step 5: Commit**

```bash
git add src/game/ui/callsignInput.ts src/game/ui/callsignPrompt.ts src/game/scenes/ProfileScene.ts
git commit -m "feat(touch): name the pilot with the native keyboard"
```

---

### Task 10: Copy — How to Play, Settings, the bogey-click line

**Files:**
- Modify: `src/game/scenes/HowToPlayScene.ts` (CARDS ~34-70), `src/game/scenes/SettingsScene.ts` (keypad toggle note ~18-21), `src/game/scenes/FlightSchoolScene.ts` (intro footer if it names keys only)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing other tasks import.

- [ ] **Step 1: Implement**

- Add a card (`id: "HP-TOUCH"`) after CONTROLS: title `TOUCH CONTROLS`, lead naming tablet play, rows for `◀ ▶` steer (hold), `LOCK` (tap when in range), pause button, tap answers/keypad, `MANUAL`/`HINT` tap, and drag to scroll manuals.
- Fix the CONTROLS footer: it currently claims `CLICK A BOGEY TO LOCK`, which no pointer handler implements. Replace with wording that matches what exists: keyboard `SPACE`, or the on-screen `LOCK` button on touch.
- Change the CONTROLS lead from "Keyboard first." to a line that keeps keyboard as the default and names touch as the tablet mode.
- Reword the Settings keypad note to cover tablets ("An on-screen keypad for touch devices", keep it one line).

- [ ] **Step 2: Typecheck, build, browser check**

Run: `pnpm typecheck && pnpm build`, then browse How to Play and Settings in device mode and confirm the new card renders within the existing pager.

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/HowToPlayScene.ts src/game/scenes/SettingsScene.ts src/game/scenes/FlightSchoolScene.ts
git commit -m "feat(touch): document touch controls; correct the lock copy"
```

---

### Task 11: Browser shell and rotate overlay

**Files:**
- Modify: `index.html`, `src/style.css`, `src/main.ts`

**Interfaces:**
- Consumes: the `game` instance in `src/main.ts`.
- Produces: the shell all later browser/device checks run in.

- [ ] **Step 1: Harden the shell**

- `index.html`: viewport becomes `width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no, maximum-scale=1`; add `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` (`black-translucent`), `mobile-web-app-capable`, and `theme-color` (`#0a1018`); add the icon links Task 12 generates (`favicon`, `apple-touch-icon` — reference the paths even though the files land next task).
- `src/style.css`: `html, body { position: fixed; inset: 0; overflow: hidden; overscroll-behavior: none; }`; `#game { padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); box-sizing: border-box; }`; canvas rules `touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent;`.
- `src/main.ts`: on the game canvas/container, `contextmenu` and `gesturestart` call `preventDefault()`.

- [ ] **Step 2: Rotate overlay**

- `index.html`: `<div id="rotate" role="status">ROTATE TO LANDSCAPE</div>`.
- `style.css`: hidden by default; shown only inside `@media (orientation: portrait) and (pointer: coarse)`; full-screen `#0a1018`, centered tracked caps label.
- `main.ts`: `const portrait = window.matchMedia("(orientation: portrait) and (pointer: coarse)");` apply once and on `change`: portrait → `game.loop.sleep()`, landscape → `game.loop.wake()`.

- [ ] **Step 3: Typecheck, build, browser check**

Run: `pnpm typecheck && pnpm build && pnpm preview`, then device mode: no page scroll or zoom on drag; a portrait viewport shows the overlay and the sortie behind it is frozen; rotating back resumes; desktop mouse play unchanged.

- [ ] **Step 4: Commit**

```bash
git add index.html src/style.css src/main.ts
git commit -m "feat(touch): harden the browser shell and add the rotate overlay"
```

---

### Task 12: Offline — installable PWA with music precached

**Files:**
- Modify: `package.json`, `vite.config.ts`, `vercel.json`, `src/game/scenes/HowToPlayScene.ts` (one line on the touch card)
- Create: `design/icon/mach-ops-icon.svg`, `scripts/make-icons.ts`, `public/icons/` (generated)

**Interfaces:**
- Consumes: the two HTML entries (`index.html`, `dad.html`) already configured in `vite.config.ts`.
- Produces: `pnpm icons` script; generated `public/icons/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon-180.png`.

- [ ] **Step 1: Dependency and config**

- `pnpm add -D vite-plugin-pwa sharp`.
- `vite.config.ts`: add `VitePWA({ registerType: "autoUpdate", devOptions: { enabled: false }, manifest: { name: "Mach Ops: Weapons-Grade Math", short_name: "Mach Ops", display: "standalone", orientation: "landscape", scope: "/", start_url: "/", background_color: "#0a1018", theme_color: "#0a1018", icons: [ { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }, { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" } ] }, workbox: { globPatterns: ["**/*.{js,css,html,svg,woff2,mp3,png}"], maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, navigateFallback: "/index.html", navigateFallbackDenylist: [/^\/dad\.html$/] } })`.
- `vercel.json`: a headers entry with `Cache-Control: no-cache` for `/sw.js`, `/manifest.webmanifest` and `/registerSW.js`.

- [ ] **Step 2: The icon**

`design/icon/mach-ops-icon.svg`: `#0a1018` rounded square, a top-down airframe silhouette (`design/svg/t38-top-silhouette.svg` geometry is the reference) in the HUD accent, no text. `scripts/make-icons.ts` uses `sharp` to rasterize it to the four PNGs in `public/icons/` (the maskable export with ~20% safe-zone padding). Add `"icons": "tsx scripts/make-icons.ts"` to `package.json` scripts and commit the generated PNGs.

- [ ] **Step 3: Copy and registration check**

Add the one-line offline tip to the How to Play touch card ("Add to Home Screen to play offline"). With `registerType: "autoUpdate"` and default injection, both HTML pages register the service worker; confirm the built `dist/index.html` and `dist/dad.html` both contain the registration script after `pnpm build`.

- [ ] **Step 4: Verify build, precache and offline**

Run: `pnpm typecheck && pnpm build && pnpm preview`
- DevTools → Application → Manifest: name, icons, standalone, landscape.
- Service worker registered; Cache Storage contains the three MP3s (proves `maximumFileSizeToCacheInBytes` worked).
- DevTools "Offline" → reload `/`: the game boots; navigate `/dad.html`: it loads.
- `pnpm test` and `pnpm build` remain green (glob patterns must not break the build).

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts vercel.json design/icon scripts/make-icons.ts public/icons src/game/scenes/HowToPlayScene.ts
git commit -m "feat(pwa): offline installable build with music precached"
```

---

### Task 13: Real-iPad acceptance pass

**Files:**
- Create: `docs/TABLET-DEVICE-PASS.md` (evidence table: one row per checklist item, pass/fail, note, screenshot path when useful)

**Interfaces:**
- Consumes: everything above; the deployed preview or production URL; a real iPad; Safari.
- Produces: the acceptance evidence the spec requires. **This task needs Bob (or a device) — an agent without the iPad stops here.**

- [ ] **Step 1: Run the spec's 14-item checklist on the iPad**

Against the production URL (or one fixed preview; preview origins have their own service worker). Record each item in `docs/TABLET-DEVICE-PASS.md`; the list is in the spec's "Testing" section, from touch-only sortie to PWA update. Take screenshots for items 5–7 (no browser interference, safe area, rotate overlay) and item 12 (offline sortie).

- [ ] **Step 2: File failures as follow-ups, not silent fixes**

Anything that fails gets a line in the evidence doc with the repro, and a fix task appended to this plan (or a new plan for anything large). Do not mark this task complete with open failures.

- [ ] **Step 3: Commit the evidence**

```bash
git add docs/TABLET-DEVICE-PASS.md
git commit -m "docs(touch): real-iPad acceptance evidence"
```

---

## Self-review notes

- Every spec requirement maps to a task: controls (1–4), manual/hint (7–8), naming (9), keypad + Flight School (5–6), copy (10), shell (11), offline (12), device evidence (13).
- Deliberately not in this plan: tap-a-bogey-to-lock, portrait layouts, Android device testing, gamepad — the spec's out-of-scope list.
- Interface names defined once and reused: `TouchControls`, `mountTouchControls`, `mergeTurn`, `applyHold`, `holdTurn`, `buildKeypad`, `applyKey`, `attachNativeEntry`.
