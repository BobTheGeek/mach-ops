# Phase 11 notes

The /dad parent view: Screens 14, 14B–14E.

## What landed

```
pnpm dev          # the game at /, the parent view at /dad.html
pnpm test         # the full suite
pnpm build        # typecheck + both pages
```

- **14C Heat map** — 83 sub-skills grouped quarter → chapter → skill, collapsible,
  honors badged, with the most-picked error tag on every row.
- **14D Schedule** — every chapter with an editable opening date, the airframe
  its boss earns, and force-open / force-shut overrides. Plus the two parent
  rules.
- **Activity** — answers, correct and distinct skills per day, newest first.
- **14E Credits** — curriculum, aircraft figures, Khan Academy, fonts, sound and
  a plain statement of where the data lives.
- **14B Empty state** — for a pilot who has not answered anything yet.
- **Export CSV** — one row per sub-skill, every field quoted.
- A `PARENT VIEW ↗` button on the Settings screen, which is the only way in.

## It is a second page, not a scene

`design/README.md` says the parent view is "intentionally plain (light, Plex
Sans) and not on the game skin", and that plain HTML for it is fine. So it is a
second Vite entry rather than a Phaser scene.

That is not just taste. A 83-row collapsible table, checkboxes, a file download
and selectable text are all free in the DOM and all fiddly on a canvas. It also
keeps the parent view at 13 kB against the game's 2 MB: a parent opening it does
not download Phaser.

`src/dad/report.ts` holds every derivation and is pure — the heat map, the CSV
and the schedule table all read from it, so they agree by construction and all
three are tested without a browser. `src/dad/main.ts` only draws.

## First-try accuracy

`design/README.md` asks for "first-try accuracy history", and the log could not
support it: a retry after a wrong answer was written exactly like any other
answer.

`Attempt.firstTry` records it now. The sortie already tracked `attemptedThisLock`
for the intel-card rule, so the flag is `!attemptedThisLock` — taking a hint does
not make an answer a retry, because the hint is recorded separately in
`hintsUsed`. Every briefing answer is a first try, since a prep card is asked
once and moves on whether it was right or wrong.

The field is optional on purpose. Anything logged before it existed has no flag,
and `undefined` there means "not recorded", not "was a retry".

`accuracyOf` therefore picks one reading per skill and names it:

- any answer carrying the flag → first-try accuracy, counting only those
- none → accuracy across every attempt, labelled as such on the page

It is all-or-nothing per skill rather than a blend, because averaging a strict
measure with a lenient one produces a number that is neither. The page says which
it is showing, in the summary tile and under the heat map title.

This is a harsher number, which is the point. A skill answered wrong and then
right on the retry now reads 0%, not 50%.

## The error tag is the useful column

A percentage says a skill is weak. The error tag says what to do about it. Every
distractor in the registry is a named mistake, the sortie records which one was
picked, and the heat map now surfaces the one picked most often on each row —
`double-neg ×2` next to a 44%. That is the column worth reading.

## What the parent can change

Two different questions, two separate fields.

`scheduleOverrides` forces a chapter open or shut regardless of its date, which
is the design's "open next unit now". `scheduleDates` moves the date itself, so
the schedule can be made to match the real school calendar rather than the
placeholder dates `schedule.json` ships with.

`schedule.json` is fetched from a deployed URL and the browser cannot write to
it, so a date edit is an override in the pilot's own save.
`withDateOverrides(schedule, dates)` folds those edits back into a `Schedule`,
and `gameState.schedule` returns that rather than the raw JSON. Everything
downstream — `isUnitOpen`, `openUnits`, `activeUnit`, the hangar, the heat map —
keeps reading one shape and cannot disagree about when a chapter opens. It
returns the schedule unchanged when there is nothing to apply, so the ordinary
case costs nothing.

A quarter's start is not a separate setting. It is the earliest chapter in that
quarter, recomputed from the units, so moving the first chapter moves the quarter
with it and the two can never contradict each other. Moving Chapter 4 from
October to September was enough to open Quarter 2 in the hangar.

An unparseable date is ignored rather than treated as zero, which would have
opened everything at once.

## Verified in the browser

ego-browser, against `pnpm dev`, on a save seeded with 141 answers across 18
skills at deliberately mixed accuracy:

- A sortie flown with one answer deliberately wrong then right on the retry:
  the log recorded `ns.1.5 N ft=true` then `ns.1.5 Y ft=false`, and the heat map
  scored that skill 0%, not 50%
- Heat map with all five heat states, honors badges, collapse and honors-only
- Forcing Ch 4 open wrote `{"ch4":true}` to the save and the pill read
  `Forced open` with a `Clear` beside it
- Activity across seven days
- Export CSV downloaded `mach-ops-viper.csv`: 84 lines, header plus 83 skills
- The empty state on a cleared save
- `PARENT VIEW ↗` on the Settings row
- Moving Chapter 4 to 15 September wrote `{"ch4":"2026-09-15"}`, flipped its row
  to Open with a Reset beside it, and the game's hangar then showed Quarter 2
  open with Chapter 4 flyable and Chapter 5 still locked
