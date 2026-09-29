# Mach Ops: Weapons-Grade Math

Browser arcade flight game (Phaser 3 + TypeScript + Vite, 1280x720, Chromebook target)
that teaches FSD Honors Math 7.

Read in this order: `docs/design.md`, `docs/engine-rules.md`, `content/GENERATOR_SPEC.md`,
`DESIGN_RECONCILIATION.md`, `design/README.md`, `content/curriculum/*.json`, `content/examples/`.

```
pnpm install
pnpm dev          # play it: http://localhost:5173 · parent view: /dad.html
pnpm test         # property tests over 10k seeds per generator, plus engine and game tests
pnpm build        # typecheck + production bundle
pnpm curriculum   # merge + validate content/curriculum/*.json -> src/data/curriculum.json
pnpm mission      # print a 20-problem mission for a sample attempt log
```

Playable end to end: Flight School, hangar, ninety-eight sorties across all ten
chapters with the honors skills mixed in, briefing, sortie in whichever airframe
the pilot has unlocked, in the paint scheme they picked, with synthesised avionics
audio over scrolling terrain, a tanker refuel at bingo fuel, debrief, the airframe
unlock reveal, intel cards, the pilot profile, the fleet spec sheet, Flight Manual,
How to Play and settings. All 83 skills have generators, manual pages and property
tests.

Every dimension on the fleet spec sheet comes from `design/accuracy-check.md`, which
cites a USAF, NAVAIR, NASA or National Museum fact sheet per airframe. Where that
document gives no figure, the screen shows a dash rather than a guess.

The `/dad.html` parent view is a second, plain page: a skill heat map across all
83 sub-skills, the chapter schedule with force-open overrides, activity by day,
credits, and a CSV export. It is deliberately off the game skin and does not load
Phaser.

Phase status: see `docs/engine-rules.md` "Build plan" and the phase notes in
`docs/` (`PHASE1-NOTES.md` through `PHASE11-NOTES.md`) and `DECISIONS.md`.
