# Chapter Medals — Design

_Status: approved in brainstorming, 2026-09-30. Next step: implementation plan._

## Intent

One medal per chapter, shown where the progress it represents lives: on the hangar
chapter cards (what the pilot has conquered), in a reveal after the boss debrief
(what he just earned), and as a rack on the Pilot Profile (the collection). Three
tiers, bronze → silver → gold, matching the medal library in the design handoff
(`Mach Ops - Medals.dc.html`, `medals.js`, `svg/medals/`).

Success: a pilot reading any of the three surfaces knows exactly what he has
earned for a chapter and what the next tier needs.

## Decisions already taken

- **Tiers and criteria** (all require the boss pass — the existing bar: boss
  sortie flown to the end, not failed):
  - **1 · AIRMANSHIP** — boss passed.
  - **2 · DISTINGUISHED** — boss passed + every core chapter skill ONLINE or
    OPTIMIZED + shields never zero on the pass run.
  - **3 · ACE** — boss passed + every core skill OPTIMIZED + every attached
    honors skill OPTIMIZED ("all honors missions complete" reads as the chapter's
    honors skills; no separate honors-mission record exists).
- **Shields note:** in this codebase a pass already implies shields never hit
  zero (a shields-down run ends the sortie and does not pass). The criterion
  stays in the rules module — it drives the criteria row and stays honest if the
  pass rule ever changes — and no artificial distinction is manufactured.
- **Upgrade-only:** stored tier = `max(stored, candidate)`, evaluated at the boss
  debrief. Skills decay never claws a medal back.
- **Rewards**, granted once per tier reached: T1 +200 CR; T2 +500 CR and the next
  intel card for the chapter's boss airframe (`BOSS_UNLOCKS[unitId]`, or the
  airframe flown for Chapter 1); T3 +1,000 CR and the boss airframe's alternate
  livery where one ships (only F/A-18, ch7, today). A jump straight to ACE
  grants only the T3 reward.
- **Placements:** hangar chapter cards; `MedalAwardScene` (07C) auto-shown after
  a boss debrief when the tier moves; Pilot Profile rack.
- **Deviation from the handoff, approved:** no separate "chapter standing" row in
  `DebriefScene` — the award scene covers the moment, and the hangar card's gap
  line covers the standing.

## Constraints

- Matches repo conventions: pure `engine/` modules, one localStorage save key,
  deterministic where the game demands it (medals touch neither generators nor
  the queue), Chromebook budget, no server.
- Medal art comes from the handoff SVGs, vendored into `design/svg/medals/`.
- Scenes are not unit-tested in this repo; scene behavior is verified by
  typecheck, build, and a browser pass.

## Architecture

### New pure module — `src/engine/medals.ts`

```ts
export type MedalTier = 1 | 2 | 3;

export interface MedalStanding {
  bossPassed: boolean;
  /** the boss run under evaluation ended with shields above zero */
  shieldsNeverZero: boolean;
  /** EngineState per core chapter skill and per attached honors skill */
  core: EngineState[];
  honors: EngineState[];
}

export const MEDAL_NAME: Record<MedalTier, string>;    // AIRMANSHIP / DISTINGUISHED / ACE
export const MEDAL_CREDITS: Record<MedalTier, number>; // 200 / 500 / 1000

/** null when the boss has not passed; otherwise 1, 2 or 3 per the criteria. */
export function candidateTier(s: MedalStanding): MedalTier | null;

/**
 * The one-line gap to the next tier, exact strings:
 *   no medal      PASS THE BOSS FOR AIRMANSHIP
 *   held 1        NEXT: DISTINGUISHED · {n} SKILLS TO ONLINE · KEEP SHIELDS ABOVE 0
 *                 (n = core skills not yet ONLINE; the middle clause drops at n = 0)
 *   held 2        NEXT: ACE · {x} TO OPTIMIZE · HONORS {y}/{z}
 *                 (x = core skills not yet OPTIMIZED; honors clause drops at z = 0)
 *   held 3        ACE · ALL HONORS COMPLETE, or ACE · CHAPTER COMPLETE at z = 0
 */
export function gapLine(held: MedalTier | null, s: MedalStanding): string;

/** BOSS PASSED / SKILLS ONLINE n/n / SHIELDS NEVER ZERO / FOR ACE counts. */
export function standingCounts(s: MedalStanding): {
  coreOnline: number; coreTotal: number;
  coreOptimized: number;
  honorsOptimized: number; honorsTotal: number;
};

/** Per-tier reward: T1 {credits only}; T2 {+ intel card}; T3 {+ livery}. */
export function rewardFor(tier: MedalTier): { credits: number; intelCard: boolean; paint: boolean };
```

Semantics: ONLINE = `fluent` or `mastered`; OPTIMIZED = `mastered`. An empty
`honors` array is vacuously "all honors complete".

### Save — `src/game/save.ts`

Two fields, defaulted by the existing `load()` fresh-merge so old saves gain
empty maps:

```ts
medals: Record<string, MedalTier>;      // highest ever awarded, by unit id
medalsSeen: Record<string, MedalTier>;  // highest tier the hangar has drawn
```

Pure reducers:

```ts
export function awardMedal(file: SaveFile, unitId: string, tier: MedalTier): SaveFile; // max
export function seeMedal(file: SaveFile, unitId: string): SaveFile;  // seen = stored
export function applyMedalAward(file: SaveFile, opts: {
  unitId: string; tier: MedalTier;
  /** next intel card index to grant, or null when T1 / nothing to grant */
  card: { airframe: string; index: number } | null;
  /** shop item id of the livery to grant, or null when none ships */
  paintItem: string | null;
}): SaveFile;
```

`applyMedalAward` adds `MEDAL_CREDITS[tier]`, calls `earnIntelCard` when a card
is passed, adds `paintItem` to `owned`, and raises `medals[unitId]`. One call,
one `gameState.update`.

### Art pipeline — `src/game/assets.ts` + vendored SVGs

- Copy the handoff's 15 files into `design/svg/medals/`:
  `medal-{1,2,3}-{earned,locked,new}.svg`, `ribbon-{1,2,3}-{earned,locked}.svg`.
- Second `import.meta.glob("../../design/svg/medals/*.svg")`; rasterize at the
  existing `RASTER_SCALE = 2` from the largest use (pendant 300 px, ribbon
  72 px); texture keys `medal-1-earned`, `ribbon-2-locked`, etc.
- `loadMedalSprites(scene)` loads all 15 (tiny text files) for scenes that show
  medals: Hangar, MedalAward, Profile.
- The NEW ring is baked into the `-new` asset; the pulse is a scale 1→1.06,
  800 ms yoyo tween — the existing lock-pulse rhythm.

### UI

- `ui/tokens.ts` gains the medal palette from the handoff: bronze `#A8703A`,
  silver `#B8C2CC`, gold `#F5B841`, locked `#111B27`/`#223347`, stripe green
  `#86F0A3`, stripe blue `#7DD3FC`.
- **HangarScene.chapterCard** — pendant 48 beside the airframe sprite; ribbon bar
  56 right-aligned on the skills row; one muted gap line under it, coloured by
  the held metal. No medal → the tier-agnostic locked pendant. NEW ring shows
  when `medals[u] > medalsSeen[u]`; after drawing all cards the scene marks
  them seen in one update, so the ring survives until the pilot actually sees
  it. Risk: card height varies by band; the gap line is the first thing to
  truncate on a short card.
- **MedalAwardScene** (new, `UnlockScene`-shaped; registered in `main.ts`) —
  auto-started ~700 ms after a boss debrief when the tier moves. Data:
  `{ unitId, tier, upgraded }`. Screen: `AWARDED` (first earn) or `UPGRADED`
  badge; pendant 300 in the new state; medal name; `TIER n · ★s · CHAPTER n`;
  the criteria checklist from `standingCounts`; rewards line
  (`+500 CR · INTEL CARD 06 · F-14 · REPLAY BOSS ANY TIME TO UPGRADE`); `TO
  HANGAR · ENTER`. Audio: reuse `unlockReveal`.
- **UnlockScene** — optional `next?: { scene: string; data: object }`; when set,
  the button reads CONTINUE and ENTER hands off instead of Hangar. Used to chain
  Unlock → MedalAward → Hangar when one boss does both.
- **DebriefScene** — after `settleBoss()`: build `MedalStanding` from
  `gameState.skillsIn(unitId)` splits (core/honors) + `debrief.shields`; compute
  candidate; when it exceeds stored, compute the card index and paint item and
  call `applyMedalAward` once. The card index is
  `min(have + 1, dossierCardCount)` and is granted only while
  `have < dossierCardCount`; the airframe is `BOSS_UNLOCKS[unitId] ?? the
  airframe flown`. `actions()` chains: unlock+medal → Unlock(next:
  MedalAward); medal only → MedalAward; unlock only → Unlock (today's flow).
  A failed run evaluates nothing.
- **ProfileScene** — a CHAPTER MEDALS strip at the bottom: ten ribbons (72×20)
  across, locked silhouettes for chapters without one, and the counts line
  `ACE n · DISTINGUISHED n · AIRMANSHIP n · TOTAL n/10`. The handoff's 5×2 grid
  becomes one full-width row. The paint panel gives up height if the fit needs
  it.

## Data flow

```
boss sortie ends
  → DebriefScene: completeSortie, grade, passBoss, unlock (existing)
  → MedalStanding from skill states + this run's shields
  → candidateTier > stored ? applyMedalAward (tier, credits, card, livery) : no-op
  → chain [Unlock →] MedalAward → Hangar
  → Hangar draws cards (ring for unseen tiers) then seeMedal marks them seen
```

## Edge cases

- Skill decay after the award: stored medal stands.
- ACE before honors existed: stays ACE; gap line `ACE · ALL HONORS COMPLETE`.
- Failed boss run: no evaluation, no scene, stored unchanged.
- Replay upgrade T1→T2 pays the T2 reward once; replay at ACE shows nothing.
- Catch-up for saves predating the feature: evaluated on the next boss debrief;
  a jump 0→3 grants T3's reward only.
- Empty honors list is vacuously complete.

## Testing

- `tests/engine/medals.test.ts` (new): `candidateTier` matrix (no pass, pass
  only, pass+core online, shields gate, all mastered, honors shortfall, empty
  honors), `gapLine` strings, `standingCounts`, credit table.
- `tests/game/save.test.ts` additions: `awardMedal` max behavior, `seeMedal`,
  `applyMedalAward` credits/card/livery in one pass, load-fill of both fields.
- `pnpm typecheck`, `pnpm build`, and the `tests/game|engine|dad` suites.
- Browser pass over the three surfaces (scenes are not unit-tested here).

## Out of scope

- Medals in the `/dad` parent view.
- Any new audio cue (the award reuses `unlockReveal`).
- Shop/Profile changes beyond the rack strip.
