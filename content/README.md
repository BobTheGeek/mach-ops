# Mach Ops content package

- `GENERATOR_SPEC.md` — the contract for generators, distractors, tiers, no-repeat guards, tests, Flight Manual pages, Math kit representations, build order, attribution. Read first.
- `curriculum/` — skill registry, one file per pair of chapters plus `honors-grade8.json`; `skill.schema.json` validates them. 54 core + 29 honors = 83 skills.
- `examples/generators/ns.1.4.ts` — the template generator.
- `examples/manual/ns.1.4.md` — the template Flight Manual page.

Claude Code kickoff (Phase 1): load the schema and all registry files, generate `curriculum.json` (merged), then implement Chapter 1 generators and manual pages following the two examples, with the tests in GENERATOR_SPEC section 7. Stop and report when `ns.1.1`–`ns.1.5` are green.
