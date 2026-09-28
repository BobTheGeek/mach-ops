# Engine rules addendum (from the game design doc)

These three sections are lifted from "Mach Ops: Weapons-Grade Math — Game Design Doc & Build Spec". Use them until docs/design.md holds the full export; if the two ever disagree, the design doc wins.

## Adaptive progression engine

Pure TypeScript, no Phaser imports, unit-testable with synthetic attempt logs.

**Attempt log** — one record per answered problem:

```ts
interface Attempt {
  skill: string;        // registry id, e.g. "ns.1.4"
  tier: 1 | 2 | 3 | 4;
  correct: boolean;
  responseMs: number;
  hintsUsed: number;    // manual opens and HINT presses
  context: "briefing" | "sortie" | "transfer";
  errorTag?: string;    // distractor tag picked, e.g. "double-neg"
  ts: number;
}
```

**Mastery score per skill** — over the last 10 attempts:

| Component | Weight | Computation |
| --- | --- | --- |
| Accuracy | 50% | correct / attempts, tier-weighted (tier 1 = 1.0, tier 2 = 1.25, tier 3 = 1.5, tier 4 = 2.0 weight on the correct count and on the denominator) |
| Fluency | 30% | median response time vs the player's own baseline (median of their fastest 20% of correct answers across all skills); at or under baseline = 1.0, at 3× baseline or slower = 0.0, linear between |
| Transfer | 20% | accuracy on `context: "transfer"` attempts only; the total score is capped at 0.70 until at least 2 transfer problems are correct |

**States → systems status**

| Engine state | Rule | Shown as |
| --- | --- | --- |
| new | fewer than 3 attempts | OFFLINE |
| learning | score < 0.60 | CALIBRATING |
| fluent | 0.60 ≤ score ≤ 0.85 | ONLINE |
| mastered | score > 0.85 and ≥ 2 transfer correct | OPTIMIZED |

Mastered drops back to fluent if a review attempt is failed.

**Speed as a diagnostic** — fast = answered inside the fast window (5 s, `tokens.motion.fastBonusRing`):

| Pattern | Reading | Engine response |
| --- | --- | --- |
| fast + wrong | careless or a confident misconception | worked example pops in; same skill, same tier next |
| slow + wrong | not yet learned | drop one tier; serve 2–3 reps with hints available |
| slow + correct | learned, not fluent | keep tier; increase frequency in sortie (timed) contexts |
| fast + correct | fluent | tier up after 2 in a row; move to spaced review |

**Spaced repetition** — per skill: `nextDue`, `intervalDays`. New skill: `intervalDays = 1`. Success: `intervalDays *= 2`, cap 21. Failure: reset to 1. Fast-wrong: halve instead of reset (minimum 1). `nextDue = lastAttempt + intervalDays`.

**Queue assembly per mission**

| Slice | Share | Rule |
| --- | --- | --- |
| overdue / weak | 50% | skills past `nextDue`, lowest score first; capped at 40% of any single sortie |
| current unit | 30% | skills of the active chapter (and its attached honors skills) |
| warm review | 20% | random fluent/mastered skills |

Consecutive problems are never the same skill. Every 8–10 problems on a skill, insert a transfer problem (tier 4, `opts.transfer = true`).

**Tiers** — stored per skill. Tier up after 2 consecutive fast-correct; tier down after 2 wrong at the same tier. Tier 1 minimum, tier 4 maximum.

**Anti-frustration** — never more than 2 wrong in a row on the same skill within a sortie; the third serve is one tier down with a hint offered free. After a failed sortie, the next briefing opens with a warm-review problem. Streaks count across skills.

## schedule.json (placeholder dates — replace from the FSD calendar)

```json
{
  "quarters": [
    { "q": 1, "starts": "2026-08-10" },
    { "q": 2, "starts": "2026-10-12" },
    { "q": 3, "starts": "2027-01-05" },
    { "q": 4, "starts": "2027-03-15" }
  ],
  "units": [
    { "id": "ch1",  "name": "Adding & Subtracting Rational Numbers", "quarter": 1, "opens": "2026-08-10" },
    { "id": "ch2",  "name": "Multiplying & Dividing Rational Numbers", "quarter": 1, "opens": "2026-08-31" },
    { "id": "ch3",  "name": "Expressions", "quarter": 1, "opens": "2026-09-21" },
    { "id": "ch4",  "name": "Equations & Inequalities", "quarter": 2, "opens": "2026-10-05" },
    { "id": "ch5",  "name": "Ratios & Proportions", "quarter": 2, "opens": "2026-11-09" },
    { "id": "ch6",  "name": "Percents", "quarter": 3, "opens": "2027-01-05" },
    { "id": "ch7",  "name": "Probability & Statistical Measures", "quarter": 3, "opens": "2027-01-25" },
    { "id": "ch8",  "name": "Statistics", "quarter": 3, "opens": "2027-02-16" },
    { "id": "ch9",  "name": "Geometric Shapes & Angles", "quarter": 4, "opens": "2027-03-15" },
    { "id": "ch10", "name": "Surface Area & Volume", "quarter": 4, "opens": "2027-04-12" }
  ],
  "honors": {
    "1": ["8.NS.A.1", "8.NS.A.2", "8.EE.A.1", "8.EE.A.3", "8.EE.A.4", "8.EE.C.7a", "8.EE.C.7b"],
    "2": ["8.G.A.1d", "8.EE.B.5", "8.EE.B.6", "8.EE.C.8a", "8.EE.C.8b", "8.EE.C.9", "8.F.A.1", "8.F.A.2", "8.F.A.3", "8.F.B.4", "8.F.B.5"],
    "3": ["8.SP.A.1", "8.SP.A.2", "8.SP.A.3", "8.SP.B.4a", "8.SP.B.4b"],
    "4": ["8.EE.A.2", "8.G.A.2", "8.G.B.3", "8.G.B.4", "8.G.B.5", "8.G.C.6"]
  },
  "blackbirdQualification": { "opens": "2027-04-26" }
}
```

The game fetches this file from the deployed URL on every launch (not bundled). A `/dad` override stored in the save wins over the schedule until cleared. Parent toggles: "Allow early unlock on boss pass" (default off), "Honors required for boss" (default off).

## Build plan

| Phase | Engine and game | Content | Done when |
| --- | --- | --- | --- |
| 1. Engine + Chapter 1 | curriculum.json, schedule.json, mastery/scheduler/tiers/queue, property tests | Ch 1: 5 generators, 5 manual pages, Intercept cockpit skins | `npm test` green over 10k seeds per generator; `scripts/mission.ts` prints a 20-problem mission |
| 2. Vertical slice | Phaser Title/Hangar/Briefing/Sortie/Debrief, T-38, Intercept, bullet-time lock, save store, Flight Manual panel | Ch 1 campaign (8–12 missions), T-38 intel cards, Flight School, How to Play cards | Playable 10 minutes end to end; Flight School runs |
| 3. Feel | Sound per tokens.audio, hit feedback, streaks, systems panel, hangar, first-time tips, pause menu | Ch 2 sprint + Q1 honors skills | Looks and sounds like a game; Ch 2 playable |
| 4. Breadth | Remaining mission types, unlock chain, boss sorties, Patrol, Blackbird Qualification | Ch 3–10 sprints (one chapter per 1–2 weeks) + honors per quarter | All 83 skills have generators, tests, manual pages |
| 5. Dashboard + reveal | /dad heat map, schedule editor, overrides, CSV export, credits, deploy | Final manual review pass | Reveal timed to the current class chapter |

Content sprint recipe (per chapter): generators + tests → manual pages drafted → Bob reviews pages against the textbook method → campaign missions, cockpit skins, intel cards → Bob playtests the boss sortie.
