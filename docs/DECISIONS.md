# Decisions

Rulings on places where the design packet contradicted itself. Each entry says
what disagreed, what was decided, and what changed. Add to the bottom.

---

## 2026-09-28 · What turns a skill ONLINE

**The disagreement.** The How to Play card (Learning Support artboard HP5) said
ONLINE is "70% or better first-try over the last 10" and never mentioned speed.
`docs/engine-rules.md`, lifted from the game design doc, scored a weighted blend:
50% accuracy, 30% fluency, 20% transfer.

**Why it mattered.** Measured against the same seven pilots, the 50/30/20 blend
put a pilot who answered **10 of 10 correctly but slowly** at CALIBRATING, and a
pilot who got **7 of 10 but answered fast** at ONLINE. Speed outranked being
right, which is backwards for a twelve-year-old meeting new maths.

**Ruled.** Keep fluency, shrink it. `WEIGHTS` in `src/engine/mastery.ts` is now
**70% accuracy, 10% fluency, 20% transfer**.

**What that comes to:** ONLINE needs **8 of the last 10**, or **9 of 10** at a
slower pace. OPTIMIZED still needs two transfer problems correct on top.

**Changed:** `src/engine/mastery.ts`; the HP5 card now states the rule in answers
rather than in score; tests in `tests/engine/mastery.test.ts` lock the four
boundary cases.

---

## 2026-09-28 · Where ranks come from

**The disagreement.** The Profile artboard (Screens 12) and HP5 said ranks come
from XP, and showed "2ND LIEUTENANT · 3,950 / 5,000 XP".
`DESIGN_RECONCILIATION.md` section 4 said ranks "advance on total mastered
skills". There is no XP anywhere in the build.

**Ruled.** Ranks come from **mastered skills**, as already built in
`src/engine/ranks.ts`. XP is not modelled. Credits stay the reward for playing;
rank is the reward for learning, so the two say different things.

**Still open:** the artboard rank ladder is Cadet U1 · 2nd Lt U2 · Captain U3–4 ·
Major U5 · Colonel U6 — six units against ten chapters, so it predates the
current structure. The thresholds in `src/engine/ranks.ts` (0 / 8 / 20 / 40 / 65
of 83 skills) are an assumption shaped to match that ladder and can be retuned
once someone has watched a real pilot climb it.

---

## 2026-09-28 · h8.ee.c7a and h8.ee.c7b: quarter 1 or chapter 4

**The disagreement.** Both carried `quarter: 1` and appeared under quarter 1 in
`schedule.json`, but `attachTo: ["ch4"]`, and `tokens.json` puts chapter 4 in
quarter 2. A quarter-1 skill attached to a quarter-2 chapter can never be served
in the quarter it claims.

**Why quarter 2 won.** Chapter 4 is "Equations and Inequalities" and both skills
are equations skills, so the attachment is right. `h8.ee.c9`, the other honors
skill attached to chapter 4, is already marked quarter 2. Three sources agreed
against one field.

**Ruled.** Both are **quarter 2**.

**Changed:** `content/curriculum/honors-grade8.json`; the two standards moved
from `honors["1"]` to `honors["2"]` in `src/data/schedule.json`; a test in
`tests/data/curriculum.test.ts` now holds every honors skill's quarter to the
quarter of the chapters it attaches to, so this cannot come back.

**Separate, still open:** the placeholder schedule opens chapter 4 on
**2026-10-05**, but quarter 2 starts **2026-10-12**, so chapter 4 currently opens
a week inside quarter 1. Fix when the real FSD calendar lands.

---

## 2026-09-30 · The speed baseline starts from the 8 s prior

**The disagreement.** `baselineMs()` was the median of the fastest 20% of the
pilot's correct answers, with the 8 s `DEFAULT_BASELINE_MS` used only when there
were none. In theory the fastest slice is the pilot's own pace. In practice, a
measurement from one answer is a bad measurement: a single lucky 1.5 s answer on
the first card set the baseline to 1.5 s, and every honest 12 s answer after it
read as slow until the log was long enough to lift the baseline back.

**Why it mattered.** The fluency component is 10% of mastery, but it feeds the
tier rules and the status pills, so a cold-start fluke could read a careful pilot
as CALIBRATING and push the scheduler's "slow" responses for days.

**Ruled.** The 8 s default is a prior, not a cliff. It counts as one observation
and each correct answer counts as one, which is the scalar Kalman update for
equal variances: `(prior + n x observed) / (n + 1)`. One fast answer can only
pull the baseline halfway toward it, and the prior fades out at 1/n.

**Changed:** `src/engine/mastery.ts`; `tests/engine/mastery.test.ts` pins the
cold start, the convergence and the four boundary cases from the 70/10/20 ruling.
