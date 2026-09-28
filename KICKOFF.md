# Mach Ops: Weapons-Grade Math — Claude Code kickoff

Paste this into a fresh repo that contains this packet at its root.

```markdown
You are building Mach Ops: Weapons-Grade Math, a browser arcade flight game
(Phaser 3 + TypeScript + Vite, 1280×720, Chromebook target) that teaches
FSD Honors Math 7. Read, in this order, before writing code:

1. docs/design.md            — the design doc; source of truth for rules and scope
2. content/GENERATOR_SPEC.md — the Problem contract, tiers, distractors, tests, manual pages
3. DESIGN_RECONCILIATION.md  — how registry names map to the design's MK-* and AI-* components,
                               and the rules adopted from the design packet
4. design/README.md          — the visual spec; tokens.json is the source for every literal
5. content/curriculum/*.json — the skill registry (83 skills; skill.schema.json validates it)
6. content/examples/         — the template generator and template Flight Manual page

## Phase 1 — engine + Chapter 1 content. No Phaser yet.

1. Scaffold: Vite + TypeScript (strict) + Vitest + fast-check. Node 20. pnpm.
2. src/data/curriculum.json: merge content/curriculum/*.json into one file, validate
   against skill.schema.json, and add a `chapters` block with quarters from
   design/tokens.json → structure.quarterChapters. Fix tokens.json structure.subSkills=83,
   honorsSkills=29 and commit that change to design/tokens.json.
3. src/data/schedule.json from the example in docs/design.md (placeholder dates).
4. src/engine/: rng.ts (mulberry32, hash32, sha1), types.ts (Problem contract from the spec),
   mastery.ts, scheduler.ts, tiers.ts, queue.ts — rules per docs/design.md
   "Adaptive progression engine" and DESIGN_RECONCILIATION.md §4. Status mapping:
   new→OFFLINE, learning→CALIBRATING, fluent→ONLINE, mastered→OPTIMIZED.
5. src/generators/ns/ns.1.1.ts … ns.1.5.ts following content/examples/generators/ns.1.4.ts
   exactly in shape. Every registry `errors[].tag` becomes a distractor recipe.
6. src/data/manual/ns.1.1.md … ns.1.5.md following content/examples/manual/ns.1.4.md,
   with the exact section headings. Worked steps in each generator match the manual's
   numbered steps one-to-one.
7. tests/: the eight property tests from GENERATOR_SPEC §7 for each generator; engine
   tests with synthetic logs (fast-wrong halves interval; 2 fast-correct tiers up;
   queue never repeats a skill consecutively; 40% weak cap; 50/30/20 slices).
8. scripts/mission.ts: print a 20-problem mission for a sample attempt log, showing
   which MK-* figure and AI-* input each problem would use.

Conventions: pure functions, no globals, every module has a test file, commit after
each numbered step, never copy textbook text. Stop and summarize when Phase 1 is green,
listing any registry entries whose `gen` notes were ambiguous.

## Phase 2 — vertical slice (after Phase 1 review)

Phaser scenes 01 Title, 02C Hangar, 03 Briefing, 04/05/06 Sortie, 07 Debrief per
design/Mach Ops - Screens.dc.html and Curriculum Update.dc.html; T-38 only; Intercept
mission; bullet-time per tokens.motion; Flight Manual panel (M4/M5); localStorage save
after every attempt; sprites from design/svg/ rasterized at load. Placeholder terrain
from Kenney CC0 tiles. Playable end to end with Chapter 1 content.

## Then

Chapters 2–10 and honors as content sprints per docs/design.md "Build plan", one
chapter per sprint, honors skills attached to their quarter's campaigns.
```

## Packet layout

```
mach-ops-handoff/
  KICKOFF.md                      this file
  DESIGN_RECONCILIATION.md        names, rules, gaps between content and design
  docs/design.md                  export of the design doc (Share › Export › Markdown)
  content/                        skill registry, generator spec, examples
  design/                         Claude Design packet: artboards, tokens.json, sprites, svg/
```
