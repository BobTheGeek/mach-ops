# Mach Ops: Weapons-Grade Math

Browser arcade flight game (Phaser 3 + TypeScript + Vite, 1280x720, Chromebook target)
that teaches FSD Honors Math 7.

Read in this order: `docs/design.md`, `docs/engine-rules.md`, `content/GENERATOR_SPEC.md`,
`DESIGN_RECONCILIATION.md`, `design/README.md`, `content/curriculum/*.json`, `content/examples/`.

```
pnpm install
pnpm dev          # play it: http://localhost:5173
pnpm test         # property tests over 10k seeds per generator, plus engine and game tests
pnpm build        # typecheck + production bundle
pnpm curriculum   # merge + validate content/curriculum/*.json -> src/data/curriculum.json
pnpm mission      # print a 20-problem mission for a sample attempt log
```

Playable end to end: Flight School, hangar, twenty sorties across Chapters 1 and
4 with the Q1 honors skills mixed in, briefing, sortie with a steerable T-38 and
synthesised avionics audio, debrief, intel cards, Flight Manual, How to Play and
settings. 28 of the 83 skills have generators, manual pages and property tests.

Phase status: see `docs/engine-rules.md` "Build plan" and the phase notes in
`docs/` (`PHASE1-NOTES.md` through `PHASE4-NOTES.md`) and `DECISIONS.md`.
