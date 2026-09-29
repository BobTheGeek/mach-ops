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
- **14D Schedule** — every chapter, the date it opens, the airframe its boss
  earns, and force-open / force-shut overrides. Plus the two parent rules.
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

## Accuracy, not first-try accuracy

`design/README.md` asks for "first-try accuracy history". An `Attempt` carries no
first-try flag: a retry after a wrong answer is logged exactly like any other
answer, so the log cannot distinguish them after the fact.

The heat map therefore shows accuracy across every attempt on a skill, which is
the harsher of the two readings. `STRONG_AT` and `FLAGGED_BELOW` keep the
design's 85 / 70 thresholds. Recording a first-try flag on the Attempt would make
the stricter reading possible for future sorties, but it cannot be recovered for
answers already logged.

## The error tag is the useful column

A percentage says a skill is weak. The error tag says what to do about it. Every
distractor in the registry is a named mistake, the sortie records which one was
picked, and the heat map now surfaces the one picked most often on each row —
`double-neg ×2` next to a 44%. That is the column worth reading.

## What the parent can change, and what they cannot

The save holds `scheduleOverrides` as `Record<string, boolean>`, so a parent can
force a chapter open or shut, and clear the override. That covers the design's
"open next unit now".

Editing the *dates* themselves, which 14D also shows, is not possible without a
save-format change: the dates live in `schedule.json`, which the game fetches and
the browser cannot write, and the override map holds booleans rather than dates.
Left out rather than faked.

## Verified in the browser

ego-browser, against `pnpm dev`, on a save seeded with 141 answers across 18
skills at deliberately mixed accuracy:

- Heat map with all five heat states, honors badges, collapse and honors-only
- Forcing Ch 4 open wrote `{"ch4":true}` to the save and the pill read
  `Forced open` with a `Clear` beside it
- Activity across seven days
- Export CSV downloaded `mach-ops-viper.csv`: 84 lines, header plus 83 skills
- The empty state on a cleared save
- `PARENT VIEW ↗` on the Settings row
