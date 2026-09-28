# Phase 2 notes

The vertical slice: what is playable, what the packet needed, and what Phase 3
should pick up. Read alongside `KICKOFF.md` "Phase 2" and `docs/engine-rules.md`
"Build plan".

## What is playable

```
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # 226 tests, 19 files
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
| Campaign list | `CampaignScene` | ten Chapter 1 sorties; each opens once the one before it is flown |
| FS0-FS5 | `FlightSchoolScene` | four lessons, scripted; nothing written to the attempt log |
| HP0 / 13 Pause | `PauseScene` | overlay, so the lock and the world are held exactly |
| HP1-HP6 | `HowToPlayScene` | six cards with paging dots |
| 08 / 08B Dossier | `DossierScene` | T-38 specs and ten intel card slots |

Answer inputs in play: typed entry (numeric and fraction), AI-6 pick one of N,
AI-7 reorder. Figures in play: MK-1 number lines (horizontal, vertical, zero
pairs) and MK-3 tables.

## Bugs this phase found by playing it

Four defects that no unit test would have caught, and one that now has a test:

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

4. **The campaign card's brief ran straight through its detail row**, and the
   boss row's "· BOSS" ran into it from the other side. The detail moved to a
   right-aligned header slot whose position is clamped against the left label, so
   neither can collide however long the text gets.

Also fixed: the sortie's footer hint sat on top of the shield bar, the manual
panel's cost note was clipped mid-sentence (the one line the player most needs to
read before deciding), Flight School's lesson-2 bogey sat under the problem card
so the reticle the callout describes was invisible, and the pause menu's HANGAR
label overlapped its key hint.

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
| Sortie length | Per mission now: 6 to 12 problems, 240 to 360 s of fuel | The rulebook fixes the bingo warning at 90 s but not the budget. |
| Rank thresholds | 0 / 8 / 20 / 40 / 65 mastered skills | See "Copy that contradicts the engine" above. |
| First-try hit | Correct, no earlier attempt on that lock, no hint taken | The artboards say "first-try hits" without defining a hint's effect. |
| Dev date | Before the school year starts, the game opens Chapter 1 rather than showing an empty hangar. Override with `localStorage.machops.devDate` | The schedule's placeholder dates begin 2026-08-10. Remove once the FSD calendar lands. |

## The Chapter 1 campaign

Ten sorties in `src/data/campaign.ts`. Sorties 1-5 each introduce one Chapter 1
skill in registry order, 6-8 mix, 9 is a shakedown, 10 is the unit boss (Screens
11: amber, higher stakes). Problem counts climb from 6 to 12 and never fall.
A sortie opens once the one before it has been flown.

## Intel cards

Ten per airframe (`src/data/intel.ts`), earned one at a time by finishing a
sortie with six or more first-try hits — the rule the Screens 08 artboard and the
HP5 card both state. A first-try hit is a problem answered correctly with no
earlier attempt on that lock and no hint taken.

**Every card cites its source.** `design/README.md` requires that aircraft facts
come only from official sources, so each T-38 card is drawn from the USAF / Vance
AFB fact sheet figures quoted in `design/accuracy-check.md`, from that file's own
proportion and silhouette checks, or from the design packet's artboard copy.
Nothing was written from memory, and a test asserts every card carries a source.

## Copy that contradicts the engine

Two places where the artboards and the rules documents disagree. In both the
build follows `DESIGN_RECONCILIATION.md` and `docs/engine-rules.md`, since the
reconciliation says its decisions stand. **Both need a ruling.**

1. **Status thresholds.** HP5 says ONLINE is "70% or better first-try over the
   last 10" and OPTIMIZED is "90%+ including a transfer problem". The engine
   scores a weighted blend of accuracy, fluency and transfer with bands at 0.60
   and 0.85. The HP5 card in the build states the engine's actual rule, because a
   card that quotes a number the game does not use is worse than no card.
2. **Ranks.** HP5 and the Profile artboard say ranks come from XP;
   `DESIGN_RECONCILIATION.md` section 4 says they "advance on total mastered
   skills". The build uses mastered skills and does not model XP. Thresholds
   (`src/engine/ranks.ts`) are an assumption: 0 / 8 / 20 / 40 / 65 of 83 skills,
   shaped to match the artboard's unit-by-unit ladder.

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
- **Flight School lesson 1 is a callout, not a flight model.** "Fly three rings"
  draws the rings and explains the stick; it does not yet let the player steer.
  The intercept flight model is Phase 3 ("Feel"), and lesson 1 should become real
  stick time when it lands.
- **04C Tanker refuel**, the untimed rate problem that refills fuel, is specified
  in the rulebook but not built. It needs a Chapter 5 rate skill to be worth
  flying, so it is parked until then.
- **Settings (13B), Profile (12), Fleet (09/09B), Unlock reveal (10) and the
  /dad views (14x)** are not built. Phase 5 owns /dad.

## Still outstanding from Phase 1

The full export of "Mach Ops: Weapons-Grade Math — Game Design Doc & Build Spec".
`docs/engine-rules.md` carries the progression engine, the schedule and the build
plan until it lands. See `docs/PHASE1-NOTES.md` for the registry `gen` notes that
were ambiguous and the assumptions taken.
