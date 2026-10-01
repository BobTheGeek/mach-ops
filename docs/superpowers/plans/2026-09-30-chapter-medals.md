# Chapter Medals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three-tier chapter medals (AIRMANSHIP / DISTINGUISHED / ACE), awarded at the boss debrief, shown on the hangar chapter cards with a NEW ring, revealed in a 07C award scene, and racked on the Pilot Profile.

**Architecture:** A pure rules module (`src/engine/medals.ts`) evaluates the candidate tier and gap line from skill states; two save fields (`medals`, `medalsSeen`) store the highest tier awarded and the highest the hangar has drawn; a new `MedalAwardScene` mirrors `UnlockScene`; the hangar card, debrief and profile consume the rules module. Medal SVGs are vendored from the design handoff and rasterized through the existing `assets.ts` pipeline.

**Tech Stack:** Phaser 3.90, TypeScript 5.5 (strict, `noUnusedLocals`), Vite 5, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-30-chapter-medals-design.md` — the plan argues from the spec; read both.

## Global Constraints

- Pure `engine/` module: `src/engine/medals.ts` imports only `../engine/types` (type-only). No Phaser, no curriculum, no storage.
- One save key; old saves gain empty `medals`/`medalsSeen` via the existing `load()` fresh-merge. Never hand-migrate.
- Medal SVGs are copied **verbatim** from `/Users/bobgibilaro/Downloads/design_handoff_mach_ops 2/svg/medals/` into `design/svg/medals/`.
- Exact reward values: T1 +200 CR, T2 +500 CR + one intel card, T3 +1,000 CR + the boss airframe's first livery where one ships. One grant per tier reached; a jump to ACE pays only T3's reward.
- Exact gap strings (pinned by tests): `PASS THE BOSS FOR AIRMANSHIP`; `NEXT: DISTINGUISHED · {n} SKILLS TO ONLINE · KEEP SHIELDS ABOVE 0`; `NEXT: ACE · {x} TO OPTIMIZE · HONORS {y}/{z}`; `ACE · ALL HONORS COMPLETE` / `ACE · CHAPTER COMPLETE`.
- ONLINE = `fluent` or `mastered`; OPTIMIZED = `mastered`; empty honors is vacuously complete.
- Scenes are not unit-tested in this repo; scene tasks are verified by `pnpm typecheck` + `pnpm build`, then one browser pass (Task 8).
- Determinism is untouched: no changes to `engine/rng`, `queue`, `missionBuilder`, generators.

## Review Focus

1. **Old saves without medal fields** — hangar and profile must render every chapter as locked, no crash. Pinned: Task 2 load-fill test; guards in Tasks 4 and 7 (`?? null`, `?? 0`).
2. **NEW ring lifecycle** — visible on the first hangar visit after an award, cleared only after that visit draws. Pinned: Task 2 `seeMedal` test; Task 4 marking step; Task 8 QA step.
3. **Boss that both unlocks an airframe and moves the medal** — chain must be Unlock → MedalAward → Hangar, one save update each. Pinned: Task 5 `next` handoff; Task 6 chain step; Task 8 QA step.
4. **Intel card at the collection cap** — `have == total` grants nothing and must not crash or index past the dossier. Pinned: Task 2 index-rule test; Task 6 `min`/`have < total` step.
5. **Empty honors list** — ACE reachable with honors `[]` (vacuously complete). Pinned: Task 1 test.
6. **Upgrade-only** — `awardMedal` never lowers a tier even after skill decay. Pinned: Task 2 max test.

---

### Task 1: Medal rules engine

**Files:**
- Create: `src/engine/medals.ts`
- Test: `tests/engine/medals.test.ts`

**Interfaces:**
- Consumes: `EngineState` from `src/engine/types`.
- Produces (later tasks use these exact names):
  - `type MedalTier = 1 | 2 | 3`
  - `interface MedalStanding { bossPassed: boolean; shieldsNeverZero: boolean; core: EngineState[]; honors: EngineState[] }`
  - `MEDAL_NAME: Record<MedalTier, string>` = `{ 1: "AIRMANSHIP", 2: "DISTINGUISHED", 3: "ACE" }`
  - `MEDAL_CREDITS: Record<MedalTier, number>` = `{ 1: 200, 2: 500, 3: 1000 }`
  - `candidateTier(s: MedalStanding): MedalTier | null`
  - `gapLine(held: MedalTier | null, s: MedalStanding): string`
  - `standingCounts(s: MedalStanding): { coreOnline: number; coreTotal: number; coreOptimized: number; honorsOptimized: number; honorsTotal: number }`
  - `rewardFor(tier: MedalTier): { credits: number; intelCard: boolean; paint: boolean }` — card only at 2, paint only at 3.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from "vitest";
import {
  candidateTier, gapLine, standingCounts, rewardFor, MEDAL_NAME, MEDAL_CREDITS,
  type MedalStanding,
} from "../../src/engine/medals";

const standing = (over: Partial<MedalStanding> = {}): MedalStanding => ({
  bossPassed: true, shieldsNeverZero: true, core: ["mastered"], honors: [], ...over,
});

describe("candidateTier", () => {
  it("is null until the boss is passed", () => {
    expect(candidateTier(standing({ bossPassed: false }))).toBeNull();
  });
  it("reads AIRMANSHIP on the pass alone", () => {
    expect(candidateTier(standing({ core: ["learning", "new"] }))).toBe(1);
  });
  it("reads DISTINGUISHED when every core skill is ONLINE and the run was clean", () => {
    expect(candidateTier(standing({ core: ["fluent", "mastered"] }))).toBe(2);
  });
  it("holds at AIRMANSHIP when shields hit zero on the run", () => {
    expect(candidateTier(standing({ core: ["fluent"], shieldsNeverZero: false }))).toBe(1);
  });
  it("reads ACE when core and honors are all mastered", () => {
    expect(candidateTier(standing({ core: ["mastered"], honors: ["mastered"] }))).toBe(3);
  });
  it("holds at DISTINGUISHED while an honors skill is short", () => {
    expect(candidateTier(standing({ core: ["mastered"], honors: ["fluent"] }))).toBe(2);
  });
  it("treats an empty honors list as complete", () => {
    expect(candidateTier(standing({ core: ["mastered"], honors: [] }))).toBe(3);
  });
});

describe("gapLine", () => {
  it("names the boss as the way in", () => {
    expect(gapLine(null, standing({ bossPassed: false }))).toBe("PASS THE BOSS FOR AIRMANSHIP");
  });
  it("counts the core skills short of ONLINE", () => {
    expect(gapLine(1, standing({ core: ["fluent", "learning", "new"] })))
      .toBe("NEXT: DISTINGUISHED · 2 SKILLS TO ONLINE · KEEP SHIELDS ABOVE 0");
    expect(gapLine(1, standing({ core: ["fluent"] })))
      .toBe("NEXT: DISTINGUISHED · KEEP SHIELDS ABOVE 0");
  });
  it("counts the skills short of ACE, with honors", () => {
    expect(gapLine(2, standing({ core: ["mastered", "fluent"], honors: ["mastered", "new", "new"] })))
      .toBe("NEXT: ACE · 1 TO OPTIMIZE · HONORS 1/3");
    expect(gapLine(2, standing({ core: ["fluent"], honors: [] })))
      .toBe("NEXT: ACE · 1 TO OPTIMIZE");
  });
  it("reads complete at the top", () => {
    expect(gapLine(3, standing({ honors: ["mastered"] }))).toBe("ACE · ALL HONORS COMPLETE");
    expect(gapLine(3, standing({ honors: [] }))).toBe("ACE · CHAPTER COMPLETE");
  });
});

describe("standingCounts", () => {
  it("counts online and optimized separately", () => {
    expect(standingCounts(standing({ core: ["fluent", "mastered", "new"], honors: ["mastered"] })))
      .toEqual({ coreOnline: 2, coreTotal: 3, coreOptimized: 1, honorsOptimized: 1, honorsTotal: 1 });
  });
});

describe("constants", () => {
  it("names the tiers and pins the rewards", () => {
    expect(MEDAL_NAME).toEqual({ 1: "AIRMANSHIP", 2: "DISTINGUISHED", 3: "ACE" });
    expect(MEDAL_CREDITS).toEqual({ 1: 200, 2: 500, 3: 1000 });
    expect(rewardFor(1)).toEqual({ credits: 200, intelCard: false, paint: false });
    expect(rewardFor(2)).toEqual({ credits: 500, intelCard: true, paint: false });
    expect(rewardFor(3)).toEqual({ credits: 1000, intelCard: false, paint: true });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/engine/medals.test.ts`
Expected: FAIL — cannot resolve `../../src/engine/medals`.

- [ ] **Step 3: Implement `src/engine/medals.ts`**

Semantics from the spec: ONLINE = `fluent | mastered`, OPTIMIZED = `mastered`; `candidateTier` walks pass → ACE (all mastered) → DISTINGUISHED (core all online AND `shieldsNeverZero`) → 1. `gapLine` builds the exact strings above with `n = coreTotal - coreOnline` (clause dropped at 0) and `x = coreTotal - coreOptimized` (honors clause dropped at `honorsTotal === 0`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/engine/medals.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/medals.ts tests/engine/medals.test.ts
git commit -m "feat(medals): pure rules module for chapter medal tiers"
```

---

### Task 2: Save fields and reducers

**Files:**
- Modify: `src/game/save.ts` (interface + `newSave()` + reducers near `earnIntelCard`)
- Test: `tests/game/save.test.ts`

**Interfaces:**
- Consumes: `MedalTier`, `MEDAL_CREDITS` from Task 1.
- Produces:
  - `SaveFile.medals: Record<string, MedalTier>`, `SaveFile.medalsSeen: Record<string, MedalTier>` (both `{}` in `newSave()`)
  - `awardMedal(file: SaveFile, unitId: string, tier: MedalTier): SaveFile` — max, never lowers
  - `seeMedal(file: SaveFile, unitId: string): SaveFile` — seen = stored (no-op when no medal)
  - `applyMedalAward(file: SaveFile, opts: { unitId: string; tier: MedalTier; card: { airframe: string; index: number } | null; paintItem: string | null }): SaveFile` — credits + card + owned livery + medal, one call

- [ ] **Step 1: Write the failing tests** (append a `describe` to `tests/game/save.test.ts`)

```ts
describe("chapter medals", () => {
  it("starts with no medals and none seen", () => {
    const f = newSave();
    expect(f.medals).toEqual({});
    expect(f.medalsSeen).toEqual({});
  });

  it("raises a medal and never lowers it", () => {
    const a = awardMedal(newSave(), "ch2", 1);
    const b = awardMedal(a, "ch2", 2);
    expect(b.medals.ch2).toBe(2);
    expect(awardMedal(b, "ch2", 1).medals.ch2).toBe(2);
  });

  it("marks a medal seen only when one was earned", () => {
    expect(seeMedal(newSave(), "ch2").medalsSeen.ch2).toBeUndefined();
    expect(seeMedal(awardMedal(newSave(), "ch2", 2), "ch2").medalsSeen.ch2).toBe(2);
  });

  it("pays credits, a card and a livery in one application", () => {
    const f = applyMedalAward(newSave(), {
      unitId: "ch7", tier: 2, card: { airframe: "f18", index: 1 }, paintItem: null,
    });
    expect(f.credits).toBe(500);
    expect(f.intelCards.f18).toEqual([1]);
    expect(f.medals.ch7).toBe(2);
    const g = applyMedalAward(f, {
      unitId: "ch7", tier: 3, card: null, paintItem: "livery.f18.blueangels",
    });
    expect(g.credits).toBe(1500);
    expect(g.owned).toContain("livery.f18.blueangels");
    expect(g.medals.ch7).toBe(3);
  });

  it("fills the new maps on a save written before medals existed", () => {
    const old = JSON.parse(JSON.stringify(newSave())) as Record<string, unknown>;
    delete old.medals;
    delete old.medalsSeen;
    storage.setItem(SAVE_KEY, JSON.stringify(old));
    const loaded = load(storage);
    expect(loaded.medals).toEqual({});
    expect(loaded.medalsSeen).toEqual({});
  });
});
```

(`storage`/`SAVE_KEY`/`load` follow the file's existing persistence-test setup; reuse whatever fake storage that block already provides.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/game/save.test.ts`
Expected: FAIL — `awardMedal` is not exported.

- [ ] **Step 3: Implement the fields and reducers**

Fields on `SaveFile` with one-line comments; `medals: {}, medalsSeen: {}` in `newSave()`. `applyMedalAward` composes the existing `earnIntelCard` and appends `paintItem` to `owned` without duplicates. `awardMedal` uses `Math.max(stored ?? 0, tier)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/game/save.test.ts`
Expected: PASS (whole file, including the pre-existing cases).

- [ ] **Step 5: Commit**

```bash
git add src/game/save.ts tests/game/save.test.ts
git commit -m "feat(medals): save fields and pure award reducers"
```

---

### Task 3: Vendored medal art, palette, and loader

**Files:**
- Create: `design/svg/medals/medal-{1,2,3}-{earned,locked,new}.svg`, `design/svg/medals/ribbon-{1,2,3}-{earned,locked}.svg` (copy verbatim from the handoff)
- Modify: `src/game/assets.ts` (second glob + loader + key helper)
- Modify: `src/ui/tokens.ts` (palette)
- Test: `tests/game/medalAssets.test.ts`

**Interfaces:**
- Produces:
  - `MEDAL_SPRITE_FILES: readonly string[]` — the 15 base names, e.g. `"medal-1-earned"`, `"ribbon-2-locked"`
  - `medalKey(tier: 1 | 2 | 3, state: "earned" | "locked" | "new", kind?: "pendant" | "ribbon"): string` — e.g. `medalKey(2, "new")` → `"medal-2-new"`, `medalKey(1, "earned", "ribbon")` → `"ribbon-1-earned"`
  - `loadMedalSprites(scene: Phaser.Scene): Promise<void>` — rasterizes all 15 (pendant longest side 300, ribbon 120, at `RASTER_SCALE`)
  - `MEDAL` palette on `src/ui/tokens.ts`: `{ bronze: "#A8703A", silver: "#B8C2CC", gold: "#F5B841", bronzeDark: "#6B4520", silverDark: "#6F7A86", goldDark: "#A5761E", locked: "#111B27", lockedLine: "#223347", stripeGreen: "#86F0A3", stripeBlue: "#7DD3FC" }` and `MEDAL_METAL: Record<1|2|3, string>` → bronze/silver/gold

- [ ] **Step 1: Copy the SVGs verbatim**

```bash
mkdir -p design/svg/medals
cp "/Users/bobgibilaro/Downloads/design_handoff_mach_ops 2/svg/medals/"*.svg design/svg/medals/
ls design/svg/medals | wc -l   # expect 15
```

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { MEDAL_SPRITE_FILES } from "../../src/game/assets";

describe("vendored medal art", () => {
  it("has every sprite the loader expects", () => {
    for (const name of MEDAL_SPRITE_FILES) {
      expect(existsSync(resolve("design/svg/medals", `${name}.svg`)), name).toBe(true);
    }
  });
  it("lists exactly the 15 sprites from the handoff", () => {
    expect(MEDAL_SPRITE_FILES).toHaveLength(15);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run tests/game/medalAssets.test.ts`
Expected: FAIL — `MEDAL_SPRITE_FILES` is not exported.

- [ ] **Step 4: Implement the loader and palette**

In `assets.ts`: a `MEDAL_SVG_URLS` glob over `../../design/svg/medals/*.svg` mirroring `SVG_URLS`, `MEDAL_SPRITE_FILES` built from the 15 names, `medalKey`, and `loadMedalSprites` calling the existing `rasterise` machinery with the sizes above (pendant size 300, ribbon size 120). In `tokens.ts`: the `MEDAL` and `MEDAL_METAL` exports with the handoff's exact hex values. Key mapping note: ribbons have no `new` state — `medalKey(_, "new", "ribbon")` returns the `earned` key.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm vitest run tests/game/medalAssets.test.ts && pnpm typecheck`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add design/svg/medals src/game/assets.ts src/ui/tokens.ts tests/game/medalAssets.test.ts
git commit -m "feat(medals): vendor medal sprites, palette and loader"
```

---

### Task 4: Hangar chapter cards show the medal

**Files:**
- Modify: `src/game/scenes/HangarScene.ts` (`chapterCard`, `quarters`, `create`)

**Interfaces:**
- Consumes: Task 1 (`gapLine`, `standingCounts`), Task 2 (`medals`, `medalsSeen`, `seeMedal`), Task 3 (`loadMedalSprites`, `medalKey`, `MEDAL_METAL`).

- [ ] **Step 1: Load sprites and draw the medal on every card**

Make `create()` async and `await loadMedalSprites(this)` before `this.quarters()`. In `chapterCard`, after the skills row:
- `const held = gameState.file.medals[unitId] ?? null; const seen = gameState.file.medalsSeen[unitId] ?? 0; const isNew = held !== null && held > seen;`
- Pendant: `this.add.image(x + 14 + 36 + 54, y + h / 2, medalKey(held ?? 1, held ? (isNew ? "new" : "earned") : "locked"))` displayed at 48 px long side, guarded by `this.textures.exists(key)`.
- Ribbon: right-aligned on the skills row at 56 px wide, key `medalKey(held ?? 1, held ? "earned" : "locked", "ribbon")`.
- Gap line: `capsLabel(this, textX, title.y + title.height + 24, gapLine(held, standing), held ? MEDAL_METAL[held] : C.textMuted, TRACK.readout)` where `standing` is built from `gameState.skillsIn(unitId)` (core = `!honors`, honors = `honors`, states from `gameState.statusOf`) with `bossPassed: gameState.file.bossesPassed.includes(unitId)` and `shieldsNeverZero: true` (irrelevant to `gapLine` at all held values; `gapLine`'s strings are already caps).
- If `isNew`, tween that card's pendant `scale` 1 → 1.06 yoyo 800 ms repeat −1 (the lock-pulse rhythm). Keep a reference for the final step.

- [ ] **Step 2: Mark seen after drawing**

At the end of `quarters()`, collect the unit ids whose cards drew `isNew`; if any, apply `seeMedal` for each to one copy of the file and `gameState.update(...)` once. Drawing happens first, so the ring shows on this visit and is gone on the next.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm build`
Expected: both succeed. (Card layout must hold at every band size; if the gap line collides with the CTA on the shortest cards, shrink the gap line first, then the ribbon.)

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/HangarScene.ts
git commit -m "feat(medals): hangar chapter cards show pendant, ribbon and gap line"
```

---

### Task 5: MedalAwardScene and the Unlock handoff

**Files:**
- Create: `src/game/scenes/MedalAwardScene.ts`
- Modify: `src/game/scenes/UnlockScene.ts` (`UnlockData.next`, button, ENTER)
- Modify: `src/main.ts` (register the scene)

**Interfaces:**
- Consumes: Task 1 (`MEDAL_NAME`, `MEDAL_CREDITS`, `standingCounts`, `rewardFor`), Task 3 (`loadMedalSprites`, `medalKey`, `MEDAL`, `MEDAL_METAL`).
- Produces: scene key `"MedalAward"`, data `{ unitId: string; tier: MedalTier; upgraded: boolean }` (Task 6 starts it; `UnlockScene` hands off to it via `next`).

- [ ] **Step 1: Build the scene**

`init(data: { unitId: string; tier: MedalTier; upgraded: boolean })`. `create()` awaits `loadMedalSprites`. Layout per the handoff's 07C: badge `AWARDED` (first earn, `C.hud`) or `UPGRADED` (`C.lock`); pendant `medalKey(tier, "new")` at 300 px centred, scale-pulsed 1 → 1.06 yoyo 800 ms; `MEDAL_NAME[tier]` large; `TIER {n} · {"★".repeat(n)} · CHAPTER {n}`; criteria row from `standingCounts` (`BOSS PASSED`, `SKILLS ONLINE n/n`, `SHIELDS NEVER ZERO`, and for tier < 3 `FOR ACE · {x} OPTIMIZED · HONORS {y}/{z}` with the honors clause dropped at 0); rewards line `+{credits} CR` plus `INTEL CARD {nn} · {designation}` when the tier granted a card (card number = the airframe's card count in the file after the award) plus `PAINT SCHEME · {designation}` when it granted a livery, then `· REPLAY BOSS ANY TIME TO UPGRADE`; `TO HANGAR` button and ENTER both `scene.start("Hangar")`. Play `audio.play("unlockReveal")`.

- [ ] **Step 2: Add the handoff to UnlockScene**

`UnlockData` gains `next?: { scene: string; data?: object }`. Button label `CONTINUE` when `next` is set, else `TO THE HANGAR`; both the button and the ENTER handler start `next.scene` with `next.data` when present, else `Hangar`.

- [ ] **Step 3: Register the scene**

Import `MedalAwardScene` in `src/main.ts` and add it to the `scene` array (after `UnlockScene`).

- [ ] **Step 4: Verify**

Run: `pnpm typecheck && pnpm build`
Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add src/game/scenes/MedalAwardScene.ts src/game/scenes/UnlockScene.ts src/main.ts
git commit -m "feat(medals): award reveal scene and Unlock handoff"
```

---

### Task 6: Debrief evaluation, rewards, and the chain

**Files:**
- Modify: `src/game/scenes/DebriefScene.ts`

**Interfaces:**
- Consumes: Tasks 1, 2, 5; `BOSS_UNLOCKS` (`src/data/campaign`), `dossier`/`CARDS_PER_AIRFRAME` (`src/data/intel`), `fleetEntry` (`src/data/fleet`), `liveryItemId` (`src/data/shop`).
- Produces: nothing new for later tasks — this is where the medal event fires.

- [ ] **Step 1: Evaluate and apply after `settleBoss()`**

Add a private `settleMedal(): { unitId: string; tier: MedalTier; upgraded: boolean } | null`, called in `create()` right after `this.unlocked = this.settleBoss()`. Guards: mission `kind === "boss"` and `!this.debrief.failed`, else null. Build the `MedalStanding` from `gameState.skillsIn(unitId)` split core/honors with `gameState.statusOf`, `bossPassed: true` (already settled), `shieldsNeverZero: this.debrief.shields > 0`. `candidate = candidateTier(...)`; `stored = gameState.file.medals[unitId] ?? 0`; return null when `candidate === null || candidate <= stored` (this is the once-per-tier guard). Otherwise compute the rewards from `rewardFor(candidate)`:
- card: airframe `BOSS_UNLOCKS[unitId] ?? gameState.currentAirframe()`; `have = (file.intelCards[airframe] ?? []).length`; `total = dossier(airframe)?.cards.length ?? CARDS_PER_AIRFRAME`; grant `{ airframe, index: have + 1 }` only while `have < total`, else null.
- paint: airframe `BOSS_UNLOCKS[unitId]`; first `liveries[0]` when present → `liveryItemId(airframe, livery.id)`, else null.

Call `gameState.update(applyMedalAward(gameState.file, { unitId, tier: candidate, card, paintItem }))` once and return `{ unitId, tier: candidate, upgraded: stored > 0 }`.

- [ ] **Step 2: Chain the scenes**

In `actions()`: when `this.unlocked` **and** `this.medal` — start `Unlock` with `{ airframe, unitId, next: { scene: "MedalAward", data: this.medal } }` (keep the 700 ms delayed call). When `this.medal` only — `this.time.delayedCall(700, () => this.scene.start("MedalAward", this.medal!))`. When `this.unlocked` only — today's behaviour unchanged.

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm build`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/game/scenes/DebriefScene.ts
git commit -m "feat(medals): evaluate and award at the boss debrief"
```

---

### Task 7: Profile ribbon rack

**Files:**
- Modify: `src/game/scenes/ProfileScene.ts`

**Interfaces:**
- Consumes: Task 2 (`medals`), Task 3 (`loadMedalSprites`, `medalKey`, `MEDAL_METAL`).

- [ ] **Step 1: Draw the rack**

Make `create()` async and `await loadMedalSprites(this)`. Add a CHAPTER MEDALS strip at the bottom of the profile, below the paint panel (panel ends at y = 632): a `CHAPTER MEDALS` label at ~y = 644, then one ribbon per chapter in `gameState.chapters` order — `medalKey(held ?? 1, held ? "earned" : "locked", "ribbon")` at 72 px wide, spaced 78 px from `SCREEN_PAD` — then the counts line `ACE {n} · DISTINGUISHED {n} · AIRMANSHIP {n} · TOTAL {n}/10` with each count tinted `MEDAL_METAL`. The rack must not overlap the paint panel or leave the 720 px canvas; adjust the strip's y if the paint panel's content ever grows taller.

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm build`
Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git add src/game/scenes/ProfileScene.ts
git commit -m "feat(medals): chapter medal rack on the pilot profile"
```

---

### Task 8: Browser QA and final verification

**Files:**
- No source changes expected; fixes land in the task they belong to.

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev` (background). Open `http://localhost:5173` with the ego-browser skill (repo default browser). The dev build exposes `globalThis.__machops` for scene jumps.

- [ ] **Step 2: QA the card and rack with a seeded save**

In the browser console, seed a save into `localStorage` (`machops.save.v1`) that has, say, `medals: { ch1: 1, ch2: 3 }`, `medalsSeen: {}`, `bossesPassed: ["ch1","ch2"]`, and enough log entries for ch2 states to read mastered (or accept the locked gap line if not). Reload. Expect on the hangar: ch1 AIRMANSHIP bronze pendant (NEW ring, because `medalsSeen` is empty), ch2 ACE gold, others locked silhouettes with `PASS THE BOSS FOR AIRMANSHIP`. Leave the hangar and return: the ring is gone. On the Pilot Profile: ten ribbons — ch1 bronze, ch2 gold, rest locked — and `ACE 1 · DISTINGUISHED 0 · AIRMANSHIP 1 · TOTAL 2/10`.

- [ ] **Step 3: QA the award scene and the chain**

With `__machops`, run `__machops.scene.start("MedalAward", { unitId: "ch1", tier: 1, upgraded: false })` and again with `tier: 2, upgraded: true`. Expect: 300 px pendant with the amber NEW ring pulsing, correct badge and name, the criteria row, the rewards line, and TO HANGAR / ENTER working. Then run `__machops.scene.start("Unlock", { airframe: "f4", unitId: "ch2", next: { scene: "MedalAward", data: { unitId: "ch2", tier: 1, upgraded: false } } })` and confirm the button reads CONTINUE and lands on the award scene.

- [ ] **Step 4: Old-save QA**

Clear the medal fields from the seeded save (or use a save from before this branch) and reload the hangar and profile: every chapter locked, no crash, no NEW rings. This is Review Focus #1.

- [ ] **Step 5: Final gates**

Run: `pnpm typecheck && pnpm build && pnpm vitest run tests/game tests/engine tests/dad`
Expected: all pass. (The full generator sweep is the pre-existing ~10k-seed suite; run it only if budget allows — it is untouched by this plan.)

- [ ] **Step 6: Commit any QA fixes**

```bash
git add -A
git commit -m "fix(medals): QA pass fixes"
```

(Only if Step 2–4 found anything; skip when clean.)
