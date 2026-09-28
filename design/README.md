# Handoff: Mach Ops — Weapons-Grade Math

## Overview
Browser arcade flight game (1280×720, 16:9, Chromebook, Phaser) that teaches 7th-grade honors math (Tennessee standards, plus Grade 8 honors missions) by dressing every problem as a flight input: fuel loads, headings, intercept timing, engine maps. Player progresses through 10 chapter campaigns across 4 school quarters, unlocking 11 real USAF/USN airframes. A parent "/dad" view tracks mastery and controls the schedule. This package contains the complete visual design: every screen, component sheet, sprite asset, token file and rulebook.

## About the design files
Every `.dc.html` in this folder is a **design reference built in HTML** — the `.dc.html` files open directly in a browser and show intended look and behavior. They are not production code. The task is to **recreate these designs in the target environment** (Phaser 3 for the game; plain HTML/React for the /dad parent view is fine) using its patterns. `sprites.js` and the `svg/` exports ARE production-usable assets: load the SVGs as textures / animate their layers by `id`.

Open any `.dc.html` directly in a browser (they share `support.js` and `sprites.js` in this folder; fonts load from Google Fonts). Each artboard carries a `data-screen-label` matching the screen inventory IDs below.

## Fidelity
**High-fidelity.** Colors, type, spacing, copy and states are final. Recreate pixel-accurately at 1280×720; every literal traces to `tokens.json`. The /dad parent view is intentionally plain (light, Plex Sans) and not on the game skin.

## Art direction (locked)
- Ground #0A1018 · panels #0D1520 / #111B27 · borders #223347 · grid lines #152131
- HUD green #86F0A3 (primary) · amber #F5B841 (locks, rewards, warnings, HONORS) · ice blue #7DD3FC (shields, XP, diagram series A) · alert #FF6B4A (flak, damage, wrong answers only)
- Text #E6EDF5, muted #8BA0B8. Minimum 14 px in-game, 4.5:1 contrast everywhere.
- Type: Chakra Petch 700 display/headings; IBM Plex Mono 400/500/600 readouts, numbers, labels (letter-spacing 0.10–0.14em for caps labels); IBM Plex Sans 400/500 body. Self-host fonts for offline Chromebooks.
- 8 px spacing grid; 8 px radius on panels/buttons; 4 px on badges; 999px pills.
- Flat vector, MFD/stencil feel. No gradients, no emoji, no fake OS chrome.
- Colorblind-safe: state never by hue alone (ring + glyph, solid vs dashed, filled vs hollow).

## Screens / views
See **Screen inventory** in the project README below for the full list with IDs. Key layouts:

**Sortie HUD (04/05/06)** — full-bleed sea grid (#0B1B2B, 64 px grid #0F2438). Top bar 20/32 px padding: ALT/SPD/HDG left (14 px label, 20 px value), center status, STREAK + timer right. Bottom-left fuel (green) and SHLD (ice blue) bars 200×10 with 1 px border; bottom-right AIM pips 10×14. Player sprite 120 px at (592, 450); bogeys 72 px. Lock: reticle 100 px amber corner brackets + 128 px ring, label to the right. Bullet-time dims world with rgba(10,16,24,0.55) and slides the problem card in over 150 ms ease-in.

**Problem card** — 400–640 px wide, #0D1520, 1 px border (#223347 default, #F5B841 during lock, #86F0A3 briefing), radius 8, padding 20, gap 12–14, shadow 0 24px 48px rgba(0,0,0,.5). Header row 14 px mono caps amber (skill · chapter · fast multiplier · timer). Prompt 16–18 px Plex Sans. Input 44 px tall, 1 px green border, 20–24 px mono value with green caret. Footer 14 px muted: "ENTER · COMMIT" left, "M · MANUAL · H · HINT −50 CR" right. Math kit diagram sits left of the input when present (see Cockpit Skins).

**Hangar campaign selector (02C)** — top bar 14 px padding; quarters as four bands in a 2×2 grid (3fr/2fr columns), band padding 12, dashed border for future quarters ("OPENS JAN 6"). Chapter cards: 72 px sprite column + text column, header row (CH n · BOSS), 15 px Chakra title, skills count, HONORS n/n badge, 44 px CTA.

**Flight Manual page (M1/M2/M7)** — header 14/32 px padding with FLIGHT MANUAL label, 36 px divider, title 24 px Chakra + standard code row, status pill, ◀ ▶ 44 px arrows, ✕ close. Body: 3-col × 2-row grid (1fr 1fr 1.15fr), gap 12, blocks padding 14–16 with 14 px green caps header + 18–20 px stroke icon. Block order: What it is → How to solve it (+ diagram slot 180 px, dashed ice-blue border) → Worked example (↻ GENERATED) → Watch out for (amber, left-rule cards) → Try one (input + HINT/CHECK 44 px) → Where it shows up (chips, aircraft tie-in, Khan Academy chip 36 px pill ice blue, opens new tab).

**/dad views (14C/14D/14E)** — light: background #F4F6F8, cards #FFFFFF with 1 px #D5DBE2, radius 8, padding 16–20; text #1A222C, muted #5B6875, #8A96A3 disabled. Heat scale: #3DAF62 ≥85% · #86D9A0 70–84 · #E8963F <70 flagged · #E3E8ED unseen · #F1F3F5 dashed not yet available. Heat map rows 22 px cells, 64 px columns, grouped quarter → chapter → sub-skill with ▾/▸ collapse and compact honors badge (18 px, #B07A14).

Complete per-screen detail lives in the artboards; measure from them.

## Components
Component Library sheet (sections 01–16 + 04B badges) is the spec: HUD kit, problem card states (default/correct/wrong/hint/transfer), keypad, buttons (primary fill green / secondary outline / ghost / disabled; 44 and 56 px), status pills (OFFLINE hollow ○ · CALIBRATING amber ◆ · ONLINE green ● · OPTIMIZED green ■), intel cards, 24 px stroke icons, terrain swatches, effects, wordmark, unit badges, rank insignia, manual blocks, tutorial callout, first-time tip, pause menu, paging dots.
Math Kit sheet: math text style (MK-0) and every diagram type (MK-1 – MK-8).
Answer Inputs sheet: fraction, scientific notation, plot point, drag line, shade region, pick-one-of-N, reorder, fill table cell — each in default / focused / correct / wrong.
Badges: HONORS (amber outline, chevron glyph, 24 px, filled when complete) · KNEEBOARD OUT (green outline, square glyph).

## Interactions & behavior
Full rulebook is the **Gameplay rules** section of the project README below. Motion: bullet-time in 150 ms cubic-bezier(.4,0,1,1) with 40% world dim; lock pulse; hit flash; launch transition 1.2 s — durations in `tokens.json → motion`. Audio cue names in `tokens.json → audio`. Keyboard: Enter commit, Tab next field, M manual, H hint, 1–N pick options, arrows move points/reorder, Esc pause. Touchpad: all targets ≥ 44 px; on-screen keypad when "keypad entry" is on.

## State management
Per pilot: credits, streak, rank, callsign, paint schemes, unlocked airframes, intel cards (10 per airframe), per-sub-skill status (OFFLINE/CALIBRATING/ONLINE/OPTIMIZED) and first-try accuracy history (78 sub-skills, 24 flagged honors), first-time-tip seen flags, settings (volume, keypad vs typed, colorblind HUD). Per sortie: fuel, shields, missiles, lock state, timer, problem queue. Schedule: `schedule.json` with quarter/chapter start dates + optional override; parent toggles (show honors, honors required for boss). All data local + parent account; CSV export.

## Design tokens
`tokens.json` is the source. Summary: 19 base colors, liveries for 11 airframes, mathKit series, badge, input, motion, audio, structure. Spacing 8 px grid; radii 8/4/999; text min 14 px.

## Assets
- `svg/` — 63 layered SVGs, 2048 px long side, transparent. Per airframe: `-top`, `-top-silhouette`, `-side`, `-side-silhouette`, `-side-gear`; liveries `t38-nasa`, `f18-blueangels`; three fictional bogeys. Layer ids: `airframe`, `canopy`, `control-surfaces` (children flaperon/aileron/stab/rudder/elevon), `flame`, `gear`, `markings`.
- `sprites.js` — generator + `<mo-sprite>` web component; `MoSprites.render(type, 'livery'|'silhouette', flame, livery)` and `renderSide(...)`.
- Fonts: Google Fonts (Chakra Petch, IBM Plex Mono, IBM Plex Sans), OFL 1.1.
- Not delivered: front-3/4 heroes (side profiles are final), tileable terrain textures (CSS swatches only), F-14 sweep extremes (mid-sweep only).
- Attribution copy (Open Up Resources / Illustrative Mathematics CC BY 4.0, TN standards, Khan Academy, USAF/NAVAIR/NASA public-domain reference) is on artboard 14E and must ship in-app.

## Files
Root — nine `.dc.html` artboard files + `support.js` + `sprites.js`. `svg/` — 63 sprite exports. `tokens.json`. `accuracy-check.md` — airframe proportion audit vs official figures.

---

# Project README (screen inventory, gameplay rules)

Browser arcade flight game, 1280×720, Chromebook target, Phaser build. Teaches 7th-grade honors math (TN standards, with Grade 8 honors missions) dressed as flight inputs. 10 chapter campaigns in 4 school quarters; 11 airframes.

## Files

| File | What it is | How the build uses it |
|---|---|---|
| `tokens.json` | Colors, type scale, spacing (8 px grid), radii, motion durations/easings, audio cue names | Import directly; every literal in the artboards traces back here |
| `sprites.js` | `window.MoSprites.render(type, mode, flame)` returns layered SVG markup for all 7 airframes + 3 bogeys; also registers the `<mo-sprite>` web component | Reference implementation for planform geometry; the game should load the `svg/` exports |
| `svg/` | 56 layered SVGs (11 airframes), 2048 px long side, transparent. Per airframe: `-top`, `-top-silhouette`, `-side`, `-side-gear`; alt liveries `t38-nasa`, `f18-blueangels`; `bogey1–3` | Layer `id`s: `airframe`, `canopy`, `control-surfaces` (flaperon/stab/rudder), `flame`, `gear`, `markings` — animate by id |
| `Mach Ops - Moodboard.dc.html` | Approved direction: palette, type, F-16 study, HUD sample | Reference only |
| `Mach Ops - Fleet Sprites.dc.html` | All sprites at 120 px, side profiles, silhouettes, gear-down, liveries, bogeys, with dimensions | Sprite QA sheet |
| `Mach Ops - Component Library.dc.html` | HUD kit, problem card states, keypad, buttons, pills, intel cards, icons, terrain swatches, effects, wordmark/badges/insignia, manual blocks, tutorial callout, first-time tip, pause menu, paging dots, manual status tile | Component spec |
| `Mach Ops - Screens.dc.html` | 21 game artboards (inventory below) | Screen spec |
| `Mach Ops - Learning Support.dc.html` | Flight Manual, Flight School, How to Play, first-time tips | Screen spec |
| `Mach Ops - Curriculum Update.dc.html` | HONORS badge, quarter/chapter selector, 11-airframe chain, Blackbird Qualification, Flight Manual v2, /dad heat map v2 + schedule editor + credits | Screen spec |
| `Mach Ops - Math Kit.dc.html` | Math text style + every diagram/table type (number lines, planes, tables, models, probability, statistics, geometry, 3D) | Component spec |
| `Mach Ops - Answer Inputs.dc.html` | 8 input types × default/focused/correct/wrong | Component spec |
| `Mach Ops - Cockpit Skins.dc.html` | 8 new problem types dressed as flight inputs | Content reference |
| `accuracy-check.md` | Airframe proportions vs. official USAF/NAVAIR/NASA figures | Sprite QA |

Fonts (Google Fonts): Chakra Petch 600/700 (display), IBM Plex Mono 400/500/600 (readouts, labels), IBM Plex Sans 400/500 (body). Self-host for offline Chromebooks.

## Screen inventory

`data-screen-label` on each artboard matches the ID below.

**Core loop** (`Screens`)
- 01 Title / attract
- 02 Hangar — top bar carries FLIGHT MANUAL, HOW TO PLAY, Replay Flight School
- 03 Briefing (untimed prep, tactical map, resources) · 03B Launch transition (1.2 s)
- 04 Sortie, HUD only · 04B Bingo fuel warning · 04C Tanker refuel (untimed rate problem)
- 05 Sortie, target lock, bullet-time problem
- 06 Sortie, wrong answer: shields drain, lock breaks, retry
- 07 Debrief (Systems Sharpened list with Review links) · 07B Sortie ended, progress kept
- 08 Intel dossier, 10 cards per airframe · 08B Dossier empty, locked airframe
- 09 Fleet spec sheet, unlocked vs. silhouette
- 10 Aircraft unlock reveal
- 11 Boss sortie briefing (amber frame, higher stakes)
- 12 Pilot profile: rank, callsign, paint schemes, streak
- 13 Pause menu · 13B Settings (volume, keypad vs. typed, colorblind-safe HUD)
- 14 /dad dashboard (plain, not game skin) · 14B /dad empty state

**Curriculum update** (`Curriculum Update`)
- 02C Hangar campaign selector: quarters as bands, chapters inside, future quarters "Opens Q3"
- 09B Fleet spec sheet, 11 airframes / 10 boss sorties
- 11B Blackbird Qualification: year-end capstone briefing with 10-chapter + honors readiness checklist
- M7 Flight Manual v2 page (honors, standard code, diagram slot, Khan chip) + library tile v2
- 14C /dad heat map v2 (78 rows, quarter → chapter → sub-skill, honors badged, collapsible) · 14D schedule editor · 14E credits & attribution
- CS1–CS8 cockpit skins (`Cockpit Skins`)

**Learning support** (`Learning Support`)
- M1 Manual page, Subtract integers (blocks 1–4) · M1B blocks 5–6 (second page)
- M2 Manual page, Unit rates, opened from Debrief, "Missed this sortie" strip
- M3 Manual library, 6 units × ~10 skills, status tiles
- M4 Manual from sortie: paused-lock state, side panel
- M5 Manual from briefing: side panel beside prep problem
- M6 Fast-wrong auto pop-in, worked example + CONTINUE
- FS0 Flight School intro (SKIP / START)
- FS1 Stick time · FS2 Target lock · FS2B Wrong on purpose · FS3 Briefing · FS4 Systems & unlocks
- FS5 Completion: first intel card + first credits
- HP0 Pause menu (host) · HP1–HP6 How to Play cards (Controls, HUD legend, Lock rules, Briefing & resources, Systems/ranks/unlocks, Flight Manual)
- FT1–FT3 First-time tips (transfer problem, boss briefing, fast-wrong pop-in) + dismissed state

## Gameplay rules (single source; card copy on screens mirrors this)

**Target lock**
- Locking a bogey enters bullet-time (world dims 40%, 150 ms ease-in) and opens one problem. No cost to lock.
- Answer within the fast window → fast bonus ×1.5 credits, streak +1.
- Correct (not fast) → base credits, streak +1.
- Wrong → shields −20%, lock breaks, streak resets to 0. RETRY re-locks the same bogey; a second wrong answer costs another −20%.
- Opening the Flight Manual during a lock: timer shows PAUSED, lock held, fast bonus forfeited, no shield cost.
- Fast-wrong (wrong within the fast window): the worked example auto-pops in; CONTINUE gives the same problem again with no fast bonus.
- HINT costs 50 credits and forfeits the fast bonus.

**Briefing / prep**
- Untimed. Each correct prep answer fills a resource: fuel, shields, or missiles (card says which). Wrong answers cost nothing; retry freely.
- Boss sortie briefing: mixed review of the unit, untimed first, then timed in the sortie. Higher credit payout; failure keeps all progress.

**Resources**
- Fuel drains with time; bingo warning at 90 s remaining; a tanker offers an untimed rate problem to refill.
- Shields at 0% or fuel at 0 → sortie ends, progress kept, debrief still shown.
- Missiles (AIM pips) are spent on each fire; refill in briefing.

**Systems status (per skill)**: OFFLINE (not seen) → CALIBRATING (attempted, below mastery) → ONLINE (mastered) → OPTIMIZED (mastered + transfer problem correct). Transfer problems (mixed skills) count extra toward mastery and are subtly marked "special".

**Progression**: 10 chapters in 4 quarters (Q1 Ch 1–3, Q2 Ch 4–5, Q3 Ch 6–8, Q4 Ch 9–10). Chapters open on their schedule.json date or when the previous boss is passed, whichever is first; the parent can override ("open next unit now"). Airframe unlock chain T-38 → F-4E → A-10C → F-16C → F-14 → F-15C → F/A-18E → F-117 → F-22A → F-35A → SR-71; each chapter boss sortie unlocks the next airframe and its dossier. Ch 10 boss is the Blackbird Qualification (mixed year review, ×3 credits, all 10 chapters must be ONLINE to launch).

**Honors**: Grade 8 skills inside Grade 7 chapters, badged HONORS (amber outline). Extra credits and intel; never required for a boss or unlock unless the parent toggles "Honors required for boss". Badge appears on mission cards, manual tiles, debrief list and /dad heat map.

**Kneeboard Out**: green outline badge on briefing prep cards — untimed, no shield risk.

**Math rendering**: one text style for fractions (stacked), exponents, scientific notation, roots, absolute value, repeating decimals, π, ≤ ≥ ≠ and U+2212 minus (see Math Kit MK-0). Diagram series A = ice blue solid/filled, series B = amber dashed/hollow; green only for correct. Inputs: ≥ 44 px targets; state shown by ring + glyph, never color alone.

**Legacy note**: earlier text says "unit completion unlocks"; intel cards (10 per airframe) are earned per sortie. Ranks (5 insignia) advance on total mastered skills.

**Flight Manual**: always one click away (sortie card M key, briefing card, debrief Review links, hangar top bar, pause menu). Opening it is never a penalty; practice problems in it never count for or against the player.

**Colors are semantic**: green = HUD/primary, amber = locks/rewards/warnings, ice blue = shields/XP, alert orange = flak/damage only. Colorblind-safe toggle adds shapes and labels to every state.

## Not delivered / substituted
- Front 3/4 hangar heroes: side profiles are the final hangar art (approved).
- Terrain tiles: CSS swatches only; the build needs real tileable textures.
- Airframe accuracy: ratios verified against official figures; sweep angles and details are eyeballed (see `accuracy-check.md`). F-14 top-down is drawn at mid-sweep; the build should animate wing sweep between the unswept and swept planforms if desired.
- Earlier artboards (02 Hangar campaign list, 09 Fleet spec sheet, 14 /dad) are superseded by 02C, 09B, 14C–E; the M3 manual library tile is superseded by the v2 tile.
