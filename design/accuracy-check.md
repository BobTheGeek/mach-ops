# Aircraft accuracy check — Mach Ops sprites

Date: 2026-09-28. Sprites are normalized to length = 1000 units, so the check compares the span ÷ length ratio (top-down) and height ÷ length (side) against official figures. Tolerance: ±2%.

## Sources (US government, public domain)
- F-16C/D: USAF fact sheet — wingspan 32 ft 8 in (9.8 m), length 49 ft 5 in (14.8 m), height 16 ft (4.8 m), Mach 2 at altitude, F-16A first flight Dec 1976.
- T-38: USAF/Vance AFB fact sheet, NAVAIR — length 46 ft 4 in (14 m), wingspan 25 ft 3 in (7.6 m), height 12 ft 10 in (3.8 m), 812 mph (Mach 1.08 at sea level); NASM lists Mach 1.3.
- F-22A: USAF/JBLE fact sheet — wingspan 44 ft 6 in (13.6 m), length 62 ft 1 in (18.9 m), height 16 ft 8 in (5.1 m), "Mach two class".
- F-35A: ACC fact sheet — wingspan 35 ft (10.7 m), length 51 ft (15.7 m), height 14 ft (4.4 m), Mach 1.6.
- F/A-18E/F: NAVAIR — length 60.3 ft (18.5 m), wingspan 44.9 ft (13.68 m), height 16 ft (4.87 m), Mach 1.8+.
- SR-71: NASA Dryden fact sheet — length 107.4 ft (32.73 m), span 55.6 ft (16.94 m), height 18.5 ft (5.63 m), Mach 3+ cruise design 3.2, altitude to 85,000 ft.
- F-15C: USAF figures (63 ft 9 in length, 42 ft 10 in span, 18 ft 6 in height) — af.mil page was unreachable during this check; figures confirmed via secondary sources quoting the fact sheet.

## Ratio check (span ÷ length)
| Airframe | Official | Sprite before | Sprite after | Result |
|---|---|---|---|---|
| T-38 | 0.545 | 0.544 | 0.544 | ✓ |
| F-16C | 0.662 (with tip rails) | 0.628 | 0.660 | **fixed** — wing widened |
| F-15C | 0.672 | 0.672 | 0.672 | ✓ |
| F/A-18E | 0.744 | 0.744 | 0.744 | ✓ |
| F-22A | 0.717 | 0.716 | 0.716 | ✓ |
| F-35A | 0.681 | 0.682 | 0.682 | ✓ |
| SR-71 | 0.518 | 0.518 | 0.518 | ✓ |
| F-4E | 0.610 (38 ft 5 in / 63 ft) | — | 0.610 | ✓ new |
| A-10C | 1.078 (57 ft 6 in / 53 ft 4 in) | — | 1.080 | ✓ new · viewBox widened |
| F-14 | 1.020 unswept · 0.605 swept | — | 0.800 | drawn mid-sweep (design choice) |
| F-117 | 0.657 (43 ft 4 in / 65 ft 11 in) | — | 0.660 | ✓ new |

Side-view height ÷ length (fin top to ground, gear down) all within tolerance: T-38 0.277, F-16 0.32, F-15 0.29, F/A-18E 0.265, F-22 0.27, F-35A 0.28, SR-71 0.172.

### Sources for the four added airframes (US government)
- F-4E: USAF fact sheet / National Museum of the USAF — length 63 ft, span 38 ft 5 in, height 16 ft 6 in.
- A-10C: USAF fact sheet — length 53 ft 4 in, span 57 ft 6 in, height 14 ft 8 in.
- F-14: NAVAIR / National Naval Aviation Museum — length 62 ft 9 in, span 64 ft unswept / 38 ft swept, height 16 ft.
- F-117A: USAF fact sheet — length 65 ft 11 in, span 43 ft 4 in, height 12 ft 5 in.

Feature checklist (120 px): F-4E tandem canopy, side intakes, dogtooth wing, anhedral stab, single tall fin ✓ · A-10C straight wing, twin podded engines, twin fins, gun nose ✓ · F-14 wing glove, widely spaced engines, twin fins, tandem canopy ✓ · F-117 faceted arrowhead, W trailing edge, V-tail, no round surfaces ✓.

## Text corrections applied
- Fleet Sprites + Fleet spec sheet: T-38 span 7.7 → 7.6 m; F-16 15.1/9.5 → 14.8/9.8 m; F/A-18E 18.3/13.6 → 18.5/13.7 m.
- Dossier F-16: first flight "1974" → "1976 · F-16A" (1974 was the YF-16 prototype).
- Unlock reveal F-15: added 19.4 m / 13.1 m.

## Feature checklist (silhouette reads at 120 px)
- T-38: slim fuselage, small thin wings, single tall fin, twin nozzles, tandem canopy ✓
- F-16: single fin, bubble canopy, strakes, cropped delta, chin intake (side) ✓
- F-15: square intakes, twin fins, twin nozzles, shoulder wing, flat nose ✓
- F/A-18E: outward-canted twin fins, rectangular intakes, LERX, wing-fold line ✓
- F-22: diamond wing, widely canted fins, 2D nozzles, sawtooth edges ✓
- F-35A: stubby, canted fins, DSI bumps, single large canopy, trapezoid wing ✓
- SR-71: chines, delta, nacelles with spikes, inward-canted fins on nacelles ✓

## Known approximations (vector, not traced)
- Wing planform sweep angles are eyeballed to ±3°; leading-edge root extensions on F-15/F-22 simplified.
- F-16 ventral fins omitted from top view (hidden), present in side view.
- Canopy framing generalized; F-22/F-35 frameless correct, F-15 has one frame.
- Nozzle/flame positions follow real engine centerlines.
- Livery colors are approximations of FS 36270/36118 (Have Glass), Mod Eagle greys, Navy TPS grey; not color-matched to paint chips.

Recommend a final pass by someone who knows the airframes against USAF/NASA three-view drawings before Phaser integration; planform tweaks are single-polygon edits in sprites.js.
