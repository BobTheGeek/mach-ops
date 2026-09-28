# DESIGN.md — Mach Ops: Weapons-Grade Math

Design principles and rules for anyone adding to the game. `tokens.json` holds the values; this file holds the reasoning. When they disagree, fix the token and say so here.

## 1. What this is

A browser arcade flight game (1280×720, Phaser, Chromebook) that teaches 7th-grade honors math to one 12-year-old who loves military aircraft. The math must never look like a quiz box. Every problem is a flight input; every screen is avionics or a hangar. Accuracy about real aircraft is part of the promise.

Mood in one line: **1980s avionics meets modern arcade — serious hardware, playful pace.**

## 2. Principles

1. **Math is a flight input, not a question.** Card titles are systems readouts ("INTERCEPT SOLUTION", "ENGINE MAP"), prompts are pilot instructions, units are aviation units (NM, LB, KFT, °). If a screen would read the same with the airplane removed, redesign it.
2. **Learning is never punished.** Opening the Flight Manual, practising, or replaying Flight School costs nothing and plays a neutral sound. Only wrong answers in a live lock cost shields; hints cost credits and are labelled so up front.
3. **State is never hue alone.** Every state carries a shape or glyph: pill dots (○ ◆ ● ■), badge glyphs, ring + ✓/✕ on inputs, solid vs dashed diagram series. The colorblind toggle adds labels; the default design must already pass without it.
4. **Flat, crisp, vector.** MFD screens, stencil markings, tail codes, panel lines. No gradients, glow, glossy 3D, emoji, drop-shadowed text, or fake OS chrome. Shadows exist only to lift a modal card off a dimmed world.
5. **Serious hardware, plain parent.** The game skin is dark navy and mono. The `/dad` parent view is deliberately light, Plex Sans and undecorated — it should read like a report, not a cockpit.
6. **Real aircraft, drawn correctly.** Silhouettes must be recognisable at 120 px. Proportions are checked against USAF / NAVAIR / NASA public figures (`accuracy-check.md`). Enemy aircraft are fictional and red-brown so no real foreign type is ever a target.
7. **No filler.** No invented statistics, no lorem ipsum, no decorative icons. If a number is on screen the game can compute it.

## 3. Color

| Role | Hex | Use | Never |
|---|---|---|---|
| Ground | `#0A1018` | Page/screen background | — |
| Panel | `#0D1520` | Cards, panels | — |
| Panel raised | `#111B27` | Nested panels, table headers, inactive fills | — |
| Border | `#223347` | 1 px borders, dividers, disabled outlines | Text |
| Grid line | `#152131` | Diagram and panel grids | — |
| Text | `#E6EDF5` | Primary text | Backgrounds |
| Text muted | `#8BA0B8` | Labels, captions, disabled text (still 4.5:1 on panels) | Body copy longer than a line |
| HUD green | `#86F0A3` | Primary action, HUD readouts, focus ring, correct, ONLINE/OPTIMIZED, KNEEBOARD OUT | Damage, warnings |
| Amber | `#F5B841` | Lock reticle, rewards, credits, warnings, CALIBRATING, HONORS, hint, boss frame, diagram series B | Correct/incorrect feedback |
| Ice blue | `#7DD3FC` | Shields, XP, canopy glint, diagram series A, external links, diagram slot | Actions |
| Alert | `#FF6B4A` | Flak, damage, wrong answer, flagged | Anything decorative; never on the parent view except flags |
| Correct fill | `#0F1F1A` | Fill behind a correct input | — |
| Wrong fill | `#1F1210` | Fill behind a wrong input | — |

Sea `#0B1B2B` with grid `#0F2438`; coast `#1D3A3A`; desert `#3A3224`; cloud `#2A3644`; night `#05080D`. Bogey `#8C3B2E` / `#3A1A14`.

Parent view (`/dad`): background `#F4F6F8`, card `#FFFFFF`, border `#D5DBE2`, text `#1A222C`, muted `#5B6875`, disabled `#8A96A3`, heat scale `#3DAF62` ≥ 85 % · `#86D9A0` 70–84 · `#B9E8C6` low-confidence pass · `#E8963F` < 70 flagged · `#E3E8ED` unseen · `#F1F3F5` dashed = not yet available. Honors badge on light `#B07A14`.

Rules: one accent per element. Green and amber never sit on the same text run. Alert appears only when something was lost. Whites and blacks are tinted navy, never pure.

## 4. Type

- **Chakra Petch 700** — display, headings, wordmark, chapter titles, button labels ≥ 20 px. Letter-spacing 0.02em. All caps for screen titles.
- **IBM Plex Mono 400 / 500 / 600** — readouts, numbers, labels, keyboard hints, table cells, all math. Caps labels at 14 px with 0.14em tracking (0.10em for readouts). Numbers 20 px (28 px large). 600 for emphasised values.
- **IBM Plex Sans 400 / 500** — prompts, briefing copy, manual prose, the whole parent view. 15–18 px, line-height 1.45–1.55.

Scale (px): 14 readout/label · 16 body · 18 body-lg · 20 number · 24 h3 · 28 number-lg · 32 h2 · 44 h1 · 72 wordmark. Nothing in-game below 14 px; 12 px is allowed only for secondary text on the parent view and inside 24 px badges. Contrast 4.5:1 everywhere (3:1 only for ≥ 24 px display type).

### Math text style
One ruleset for every problem card and manual page (Math Kit MK-0):
- Fractions stacked, 2 px rule; inline `3/4` only inside table cells.
- Exponents 60 % size, raised; scientific notation `a × 10ⁿ` with `1 ≤ a < 10` enforced by the input.
- Radical overbar spans the radicand; repeating-decimal bar and absolute-value bars 2 px.
- π upright in Plex Mono, never italic.
- Proper minus U+2212, never a hyphen. Thin space around binary operators; none after unary minus.
- `≤ ≥ ≠` as glyphs, never `<=`.

## 5. Layout & spacing

- Canvas 1280×720. Screen padding 32 px (top bar 14–20 px vertical). Parent view 40 px.
- 8 px grid: 4 · 8 · 12 · 16 · 24 · 32 · 40 · 56 · 64.
- Radius 8 px on panels, cards, inputs, buttons; 4 px on badges and small chips; 999 px on pills.
- Borders 1 px `#223347`. Focus and state rings 2 px. Icon stroke 2 px, 24 px grid (18–20 px in headers).
- Every artboard is a flex column: top bar → content grid → footer hint bar. Content grids use `minmax(0, Nfr)` tracks so nothing overflows.
- Modal cards (problem, pop-in, manual side panel) sit over a `rgba(10,16,24,0.55)` dim with `0 24px 48px rgba(0,0,0,0.5)` shadow.

## 6. Components (where to look)

Component Library sheet is the spec. Key rules:

- **Buttons** — primary: green fill, `#0A1018` text, 600 weight. Secondary: 1 px green outline. Ghost: 1 px `#223347` outline, muted text. Disabled: `#223347` outline and text. Heights 44 (default) and 56 (launch/commit). Labels caps mono 14 px, 0.10em.
- **Status pills** — OFFLINE hollow ○ grey · CALIBRATING amber ◆ · ONLINE green ● · OPTIMIZED green ■. Always dot + word.
- **Badges** — 24 px tall, 4 px radius, 14 px caps, glyph + word. HONORS amber chevron (filled amber when complete). KNEEBOARD OUT green square (briefing prep: untimed, no shield risk). Compact 20 px glyph-only for heat-map rows and tiles.
- **Problem card** — header row (skill · chapter · multiplier · timer, amber caps) → prompt (Sans 16–18) → optional Math Kit diagram left, input right → footer hints. Border amber during lock, green in briefing, alert on wrong.
- **Inputs** — targets ≥ 44 px; pick rows 56 px. Focus = 2 px green ring + green caret. Correct = green ring, `#0F1F1A` fill, ✓. Wrong = alert ring, `#1F1210` fill, ✕, one-line "YOU n · ANSWER n · RETRY". Drag handles 22 px with 44 px halo.
- **Diagrams** — series A ice blue solid/filled, series B amber dashed/hollow, green only for the answer/crossing, grid `#152131`, axes `#8BA0B8`, labels 14 px mono.
- **Reticle** — 100 px amber corner brackets + 128 px ring; label to the right. Holds (dimmed ring) while the manual is open.

## 7. Motion

Fast, mechanical, few. Durations in `tokens.json → motion`:
bullet-time in 150 ms ease-in (world dims 40 %) / out 200 ms ease-out · card slide 150 ms, 24 px · lock pulse 800 ms scale 1→1.08 infinite · lock break 240 ms · hit flash 120 ms alert at 35 % · shield drain 400 ms · streak tick 180 ms · unlock reveal 1.2 s · launch transition 1.2 s.
No easing bounces, no parallax, nothing animates on the parent view. Reduced-motion setting removes pulse and flash but keeps the dim.

## 8. Sound

Synth avionics tones only; no music under a problem card. Volume ducks 50 % in bullet-time. Manual/how-to-play open with a neutral page turn — never a penalty tone. First-time tips are silent. The parent view has no audio. Cue list in `tokens.json → audio`.

## 9. Copy

- In-game labels: caps mono, aviation vocabulary (SORTIE, LOCK, BINGO, KNEEBOARD, RTB). Keyboard hints as `KEY · ACTION`.
- Prompts: second person, present tense, one or two sentences, real units. "Bogey at 2.4 NM closing 0.6 NM every 10 seconds. Set the missile timer to fire at 0.6 NM."
- Feedback never says "wrong" alone; it shows the answer and offers RETRY.
- Learning copy states cost plainly: "Practice doesn't count for or against you." "Fast bonus forfeited · lock held · no shield cost."
- Parent view: sentence case, plain English, no game slang except skill names.
- Aircraft facts only from official sources; give dimensions in metres with one decimal.

## 10. Aircraft art

- Top-down sprites are 1000 units long on a `-400 0 800 1000` viewBox (A-10 uses `-560 0 1120 1000`); side profiles nose-left on `0 0 1000 370`.
- Layers by `id`: `airframe`, `canopy`, `control-surfaces`, `flame`, `gear` (side only), `markings`. Silhouette variant is fill `#111B27` / stroke `#223347` with no canopy or markings.
- Distinguishing features must survive at 120 px (see `accuracy-check.md` checklist). Add an airframe by extending `sprites.js`, re-exporting `svg/`, and adding a row to the accuracy check with the official source.
- Liveries are approximations of real schemes (Have Glass, Mod Eagle, TPS grey); never invent unit markings for real squadrons beyond a tail code.

## 11. Accessibility

Text ≥ 14 px, contrast ≥ 4.5:1, targets ≥ 44 px, full keyboard operation (Enter, Tab, arrows, 1–N, M, H, Esc), colorblind-safe by construction, reduced-motion respected, no flashing above 3 Hz. The keypad exists for touchpad-only Chromebooks.

## 12. Adding a screen

1. Start from the nearest artboard; keep the top-bar → grid → footer structure.
2. Use only tokens; if a new value is needed, add it to `tokens.json` first.
3. Put a `data-screen-label` ID on the artboard and add it to the README inventory.
4. Dress the math: name the system, pick the unit, pick the diagram from the Math Kit and the input from Answer Inputs.
5. Check: no hue-only state, nothing under 14 px, nothing overflows 1280×720, and the aircraft on screen is the right one for the chapter.
