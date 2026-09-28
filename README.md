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

Title -> Hangar -> Briefing -> Sortie -> Debrief is playable end to end with
Chapter 1 content, T-38 and the Intercept mission.

Phase status: see `docs/engine-rules.md` "Build plan", `docs/PHASE1-NOTES.md`
and `docs/PHASE2-NOTES.md`.
