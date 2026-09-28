# Phase 2 notes

The vertical slice: what is playable, what the packet needed, and what Phase 3
should pick up. Read alongside `KICKOFF.md` "Phase 2" and `docs/engine-rules.md`
"Build plan".

## What is playable

```
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # 200 tests, 17 files
pnpm build        # typecheck + production bundle
```

Title → Hangar → Briefing → Launch → Sortie → Debrief runs end to end with real
Chapter 1 content. Verified by playing it in a browser, not only by tests.

| Artboard | Scene | State |
| --- | --- | --- |
| 01 Title | `TitleScene` | wordmark, pilot line, T-38 side profile |
| 02C Hangar | `HangarScene` | four quarter bands, ten chapter cards, future quarters dashed with their opening date |
| 03 Briefing | `BriefingScene` | three untimed prep problems, each filling fuel / shields / missiles; wrong costs nothing |
| 03B Launch | `BriefingScene.launch` | 1.2 s transition |
| 04 Sortie | `SortieScene` | sea grid, T-38 at (592, 450), three bogeys, full HUD, fuel draining |
| 04B Bingo | `SortieScene.showBingo` | warning at 90 s remaining |
| 05 Lock | `SortieScene.tryLock` | bullet-time dim, 100 px brackets + 128 px pulsing ring, card slides in |
| 06 Wrong | `SortieScene.onCommit` | shields −20%, hit flash, "YOU n · ANSWER n · RETRY", lock breaks |
| 07 / 07B Debrief | `DebriefScene` | Systems Sharpened with REVIEW links; says "progress kept" either way |
| M3 library | `ManualLibraryScene` | one status tile per skill with a page |
| M4 / M5 manual | `ManualPanel` | side panel; header states the cost before you open it |
| M6 fast-wrong | `SortieScene.showWorkedPopIn` | worked example pops in, CONTINUE re-serves the same problem |

Answer inputs in play: typed entry (numeric and fraction), AI-6 pick one of N,
AI-7 reorder. Figures in play: MK-1 number lines (horizontal, vertical, zero
pairs) and MK-3 tables.

## Bugs this phase found by playing it

Three defects that no unit test would have caught, and one that now has a test:

1. **`ns.1.2` and `ns.1.3` plotted the answer on the number line.** The figure
   spec was `points: [0, correct]`, so the Math Kit drew the answer next to the
   question. Both now plot the terms. A new property test — "only plots values
   that appear in the givens" — holds every generator to it, phrased so that a
   comparison legitimately showing both candidates still passes.

2. **No button in the game could be clicked.** `button()` put its hit area on the
   Container with the rectangle offset to the centre, so every pointer test
   missed. Input now rides on a Zone.

3. **The Hangar status pill overlapped the CTA**, then overflowed the card once
   moved. The artboard's chapter card carries the skills count and HONORS badge
   rather than a pill, so chapter progress joined that row instead.

Also fixed: the sortie's footer hint sat on top of the shield bar, and the manual
panel's cost note was clipped mid-sentence — the one line the player most needs
to read before deciding.

## Changes to the packet

- **`design/tokens.json` gains `motion.launchTransition`** (1200 ms, the same
  easing as `unlockReveal`). `docs/design.md` section 7 and `design/README.md`
  both specify a 1.2 s launch transition and both point at `tokens.json → motion`,
  but the token was not there. Added per `docs/design.md` section 12: "if a new
  value is needed, add it to `tokens.json` first".

## Assumptions to confirm

| Area | Assumption | Why |
| --- | --- | --- |
| Sortie length | 12 problems, 300 s of fuel, bingo at 90 s | The rulebook fixes the bingo warning but not the fuel budget or the problem count. |
| Briefing | 3 prep problems, filling +20% fuel / +25% shields / +2 AIM in rotation | The rulebook says each correct prep fills a resource and the card names which; it does not give the amounts. |
| Starting loadout | 40% fuel, 50% shields, 2 of 6 AIM | Chosen so prep visibly matters. |
| Credits | 100 base, ×1.5 fast, −50 hint | The hint cost is specified; the base award is not. |
| Bogeys | Three, fixed lanes, one lock at a time | Phase 2 is a slice; the intercept flight model is Phase 3 "Feel". |
| Dev date | Before the school year starts, the game opens Chapter 1 rather than showing an empty hangar. Override with `localStorage.machops.devDate` | The schedule's placeholder dates begin 2026-08-10. Remove once the FSD calendar lands. |

## Not delivered

- **Fonts.** Chakra Petch, IBM Plex Mono and IBM Plex Sans are declared in
  `src/style.css` and expected at `public/fonts/`, per `design/README.md`
  ("self-host for offline Chromebooks"). The files are not in the packet and were
  not downloaded. Until they are, the game falls back to system faces: metrics
  change, layout does not, because every measurement comes from `tokens.json`.
- **Terrain tiles.** Still CSS swatches only (`design/README.md` "Not
  delivered"). The sortie uses the sea grid. Phase 3 needs Kenney CC0 top-down
  tiles matched to the Component Library terrain swatches.
- **Audio.** `tokens.json → audio` names every cue; no sounds are authored. Phase 3
  ("Feel") owns this.
- **From the build plan's Phase 2 column:** the Chapter 1 campaign as 8–12
  distinct missions, T-38 intel cards, Flight School (FS0–FS5) and How to Play
  (HP0–HP6). `KICKOFF.md`'s narrower Phase 2 list was treated as the scope; these
  are the remainder and should be picked up before Phase 3 proper.

## Still outstanding from Phase 1

The full export of "Mach Ops: Weapons-Grade Math — Game Design Doc & Build Spec".
`docs/engine-rules.md` carries the progression engine, the schedule and the build
plan until it lands. See `docs/PHASE1-NOTES.md` for the registry `gen` notes that
were ambiguous and the assumptions taken.
