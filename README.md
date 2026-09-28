# Mach Ops: Weapons-Grade Math

Browser arcade flight game (Phaser 3 + TypeScript + Vite, 1280x720, Chromebook target)
that teaches FSD Honors Math 7.

Read in this order: `docs/design.md`, `docs/engine-rules.md`, `content/GENERATOR_SPEC.md`,
`DESIGN_RECONCILIATION.md`, `design/README.md`, `content/curriculum/*.json`, `content/examples/`.

```
pnpm install
pnpm curriculum   # merge + validate content/curriculum/*.json -> src/data/curriculum.json
pnpm test         # property tests over 10k seeds per generator
pnpm mission      # print a 20-problem mission for a sample attempt log
```

Phase status: see `docs/engine-rules.md` "Build plan" and `docs/PHASE1-NOTES.md`.
