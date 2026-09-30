// Intel cards: ten per airframe, real facts about the real aircraft.
//
// design/README.md: "Aircraft facts only from official sources; give dimensions
// in metres with one decimal." Every card below carries the source it came from,
// and every source is a US government fact sheet quoted in
// design/accuracy-check.md, the design packet's own artboard copy, or a figure
// computed from those. Nothing here is written from memory.
//
// Earning rule (Screens 08, How to Play HP5): a sortie completed with 6 or more
// first-try hits earns one card.
//
// Spec fields come from src/data/fleet.ts rather than being typed twice, so a
// corrected figure in the audited fleet table reaches the dossier with it. Where
// the fact sheets do not give a top speed, the dossier prints a dash.

import { FLEET } from "./fleet";

export const CARDS_PER_AIRFRAME = 10;
export const FIRST_TRY_HITS_FOR_CARD = 6;

export interface IntelCard {
  /** 1-based slot; cards are earned in this order */
  n: number;
  /** slot name, caps in the dossier */
  title: string;
  body: string;
  /** where the fact came from; shown in Settings > Credits */
  source: string;
}

export interface Dossier {
  airframe: string;
  designation: string;
  name: string;
  lengthM: number;
  spanM: number;
  heightM: number;
  engine: string;
  /** null when design/accuracy-check.md gives no figure; the screen shows a dash */
  topSpeed: string | null;
  crew: number;
  cards: IntelCard[];
}

/* ---------------------------------------------------------------- sources */

const ACC = "design/accuracy-check.md";
const RET = `${ACC} ratio table`;

/* ----------------------------------------------------------- card sets */

const T38_CARDS: IntelCard[] = [
  {
    n: 1, title: "TANDEM CANOPY",
    body: "Two seats in a row: student in front, instructor behind. The T-38 has trained USAF pilots since 1961.",
    source: "Design packet, Flight School artboard FS5",
  },
  {
    n: 2, title: "LENGTH",
    body: "46 ft 4 in nose to tail — 14.0 m. Short for a jet that goes supersonic.",
    source: "USAF / Vance AFB fact sheet",
  },
  {
    n: 3, title: "SPAN",
    body: "25 ft 3 in tip to tip — 7.6 m. Span divided by length is 0.545, the second-narrowest wing in the fleet after the SR-71.",
    source: "USAF / Vance AFB fact sheet; design/accuracy-check.md ratio table",
  },
  {
    n: 4, title: "HEIGHT",
    body: "12 ft 10 in from the ground to the top of the fin with the gear down — 3.8 m, a little over a quarter of its length.",
    source: "USAF / Vance AFB fact sheet; design/accuracy-check.md side-view ratio 0.277",
  },
  {
    n: 5, title: "TOP SPEED",
    body: "812 mph at sea level, Mach 1.08. The National Air and Space Museum lists Mach 1.3.",
    source: "USAF / Vance AFB fact sheet; NASM",
  },
  {
    n: 6, title: "ENGINES",
    body: "Two nozzles side by side under the fin. Two engines packed into a fuselage only 14.0 m long.",
    source: "design/accuracy-check.md feature checklist",
  },
  {
    n: 7, title: "WING",
    body: "Small, thin and barely swept. At 120 px on screen the wing is the feature that tells a Talon from a fighter.",
    source: "design/accuracy-check.md feature checklist",
  },
  {
    n: 8, title: "TAIL",
    body: "One tall fin, not two. Every later airframe in the chain except the F-16 and F-117 goes to twin fins.",
    source: "design/accuracy-check.md feature checklist",
  },
  {
    n: 9, title: "MARKINGS",
    body: "Stencilled U.S. AIR FORCE along the fuselage and a tail code. The game never invents squadron markings for a real unit.",
    source: "design/README.md art direction",
  },
  {
    n: 10, title: "SERVICE",
    body: "Slim fuselage, small thin wings, single tall fin, twin nozzles, tandem canopy: the five features a Talon must show at a glance.",
    source: "design/accuracy-check.md silhouette checklist",
  },
];

const F4_CARDS: IntelCard[] = [
  {
    n: 1, title: "TANDEM CANOPY",
    body: "Pilot and weapon systems officer in tandem, with an intake on each side. Those are the Phantom's signatures at 120 px.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 2, title: "LENGTH",
    body: "63 ft nose to tail — 19.2 m. A tenth of a metre longer than a Tomcat, and 0.2 m short of an Eagle.",
    source: `${ACC} — USAF / National Museum of the USAF`,
  },
  {
    n: 3, title: "SPAN",
    body: "38 ft 5 in tip to tip — 11.7 m, the third-slenderest planform in the fleet after the SR-71 and the Talon.",
    source: `${ACC} — USAF / National Museum of the USAF; ${RET}`,
  },
  {
    n: 4, title: "HEIGHT",
    body: "16 ft 6 in from the ground to the top of the fin — 5.0 m. Only the Raptor, the Eagle and the Blackbird sit higher.",
    source: `${ACC} — USAF / National Museum of the USAF`,
  },
  {
    n: 5, title: "WING",
    body: "A dogtooth leading edge: a notch cut out of the wing's front edge, named in the audit and readable at 120 px.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 6, title: "TAIL",
    body: "One tall fin with anhedral stabilators. The tail surfaces angle down rather than up, which is how the Phantom reads from below.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 7, title: "ENGINES",
    body: "Two turbojets fed by side intakes are what make the fuselage so wide amidships. The audit lists the intakes before anything else.",
    source: `${ACC} silhouette checklist; Design packet, Fleet Sprites artboard`,
  },
  {
    n: 8, title: "GUN",
    body: "The E model finally got a gun. It is the last thing the fleet note says about the aircraft, as if saving the best for last.",
    source: "Design packet, Fleet Sprites artboard",
  },
  {
    n: 9, title: "BOSS DROP",
    body: "Chapter 2's boss hands over the Phantom: the first airframe the campaign unlocks after the trainer.",
    source: "Design packet, boss briefs; src/data/campaign.ts BOSS_UNLOCKS",
  },
  {
    n: 10, title: "SILHOUETTE CHECK",
    body: "Tandem canopy, side intakes, dogtooth wing, anhedral stab, single tall fin: the five features the sprite was audited against.",
    source: `${ACC} silhouette checklist`,
  },
];

const A10_CARDS: IntelCard[] = [
  {
    n: 1, title: "WIDER THAN LONG",
    body: "57 ft 6 in of span over 53 ft 4 in of length: the only aircraft in the fleet whose wings reach wider than its nose is long.",
    source: `${ACC} ratio table`,
  },
  {
    n: 2, title: "RATIO",
    body: "Span divided by length is 1.078. Every other airframe in the fleet is longer than it is wide.",
    source: `${ACC} ratio table; computed from fleet figures`,
  },
  {
    n: 3, title: "WING",
    body: "No sweep in the wing at all. The straight planform is the first thing that tells a Warthog apart at 120 px.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 4, title: "ENGINES",
    body: "Twin podded engines mounted high on the rear fuselage, clear of the ground and clear of the gun's line.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 5, title: "TAIL",
    body: "Twin fins. With the podded engines, that separates it from every single-finned airframe in the fleet.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 6, title: "GUN NOSE",
    body: "The whole aircraft is built around its gun, and the fleet note points at the nose first.",
    source: "Design packet, Fleet Sprites artboard",
  },
  {
    n: 7, title: "LENGTH",
    body: "53 ft 4 in — 16.3 m. The wings out-reach the fuselage by 1.2 m, which is the whole point of the airframe.",
    source: `${ACC} — USAF fact sheet`,
  },
  {
    n: 8, title: "SPAN",
    body: "57 ft 6 in — 17.5 m, the widest span of any single-seat aircraft in the fleet. Only the two-seat Tomcat reaches further.",
    source: `${ACC} — USAF fact sheet; computed from fleet figures`,
  },
  {
    n: 9, title: "HEIGHT",
    body: "14 ft 8 in — 4.5 m, a shade taller than the Lightning II and a shade shorter than the Falcon.",
    source: `${ACC} — USAF fact sheet`,
  },
  {
    n: 10, title: "SILHOUETTE CHECK",
    body: "Straight wing, twin podded engines, twin fins, gun nose: the features the sprite was audited against.",
    source: `${ACC} silhouette checklist`,
  },
];

const F16_CARDS: IntelCard[] = [
  {
    n: 1, title: "FLY-BY-WIRE",
    body: "The first fly-by-wire fighter in service: its controls send signals, not cables, to the moving surfaces.",
    source: "Design packet, Fleet Sprites artboard",
  },
  {
    n: 2, title: "FIRST FLIGHT",
    body: "First flew December 1976, as the F-16A. 1974 belonged to the YF-16 prototype, which is why this card says 1976.",
    source: `${ACC} text corrections applied`,
  },
  {
    n: 3, title: "LENGTH",
    body: "49 ft 5 in — 14.8 m, 0.8 m longer than the Talon.",
    source: `${ACC} — USAF fact sheet`,
  },
  {
    n: 4, title: "SPAN",
    body: "32 ft 8 in with tip rails — 9.8 m. The audit widened the sprite's wing until the ratio matched the fact sheet.",
    source: `${ACC} ratio table; text corrections`,
  },
  {
    n: 5, title: "HEIGHT",
    body: "16 ft — 4.8 m, exactly a metre taller than the Talon.",
    source: `${ACC} — USAF fact sheet`,
  },
  {
    n: 6, title: "TOP SPEED",
    body: "Mach 2 at altitude, per the USAF fact sheet. Only the Raptor and the Blackbird claim more in this fleet.",
    source: `${ACC} — USAF fact sheet`,
  },
  {
    n: 7, title: "CANOPY",
    body: "A frameless bubble canopy. At 120 px the bubble and the single fin are the Falcon's two tells.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 8, title: "WING",
    body: "A cropped delta with strakes along the fuselage. The strakes are why the planform reads wider than the wing alone.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 9, title: "INTAKE",
    body: "A single chin intake under the nose. No other airframe in this fleet carries its intake there.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 10, title: "SILHOUETTE CHECK",
    body: "Single fin, bubble canopy, strakes, cropped delta, chin intake: the five features audited for the Falcon.",
    source: `${ACC} silhouette checklist`,
  },
];

const F14_CARDS: IntelCard[] = [
  {
    n: 1, title: "SWING WING",
    body: "The wings sweep: 64 ft unswept, 38 ft swept back. That is how a Tomcat fits a carrier deck and still loiters on station.",
    source: `${ACC} — NAVAIR / National Naval Aviation Museum`,
  },
  {
    n: 2, title: "SPAN",
    body: "19.5 m unswept. Swept back it narrows to 11.6 m — the widest span in the fleet and one of the narrowest, depending on the lever.",
    source: "Design packet, Fleet Sprites artboard",
  },
  {
    n: 3, title: "LENGTH",
    body: "62 ft 9 in — 19.1 m. The Tomcat is the shortest airframe in the fleet that still clears 19 m.",
    source: `${ACC} — NAVAIR / National Naval Aviation Museum`,
  },
  {
    n: 4, title: "HEIGHT",
    body: "16 ft — 4.9 m, level with the Super Hornet.",
    source: `${ACC} — NAVAIR / National Naval Aviation Museum`,
  },
  {
    n: 5, title: "WING GLOVE",
    body: "The fixed glove that the swinging panels move against is a Tomcat signature at any size.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 6, title: "TWIN FINS",
    body: "The fins sit far apart over widely separated engines, reading from above as a broad tail with a gap in it.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 7, title: "TANDEM CANOPY",
    body: "Two crew in tandem, under a canopy long enough to cover both.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 8, title: "DRAWING CHOICE",
    body: "The game's sprite is drawn mid-sweep, at a ratio of 0.800. Fully forward or fully back would misrepresent the aircraft as much as the other.",
    source: `${ACC} ratio table`,
  },
  {
    n: 9, title: "ENGINES",
    body: "Two turbofans set well apart, feeding the widest-spaced exhausts in the fleet.",
    source: "Design packet, Fleet Sprites artboard",
  },
  {
    n: 10, title: "SILHOUETTE CHECK",
    body: "Wing glove, widely spaced engines, twin fins, tandem canopy: the four features audited for the Tomcat.",
    source: `${ACC} silhouette checklist`,
  },
];

const F15_CARDS: IntelCard[] = [
  {
    n: 1, title: "TALLEST",
    body: "18 ft 6 in — 5.6 m from the ground to the fin top. Level with the Blackbird, and nothing else in the fleet stands taller.",
    source: `${ACC} side-view ratios; computed from fleet figures`,
  },
  {
    n: 2, title: "WING",
    body: "The most wing for its weight of anything in the fleet, which is the fleet note's own line for the Eagle.",
    source: "Design packet, Fleet Sprites artboard",
  },
  {
    n: 3, title: "LENGTH",
    body: "63 ft 9 in — 19.4 m, shorter than only the Nighthawk and the Blackbird.",
    source: `${ACC} — USAF figures via secondary sources`,
  },
  {
    n: 4, title: "SPAN",
    body: "42 ft 10 in — 13.1 m: 0.1 m less than the Nighthawk and 0.5 m less than the Raptor.",
    source: `${ACC} — USAF figures via secondary sources`,
  },
  {
    n: 5, title: "SQUARE INTAKES",
    body: "Square intakes under the wing roots: the first feature the audit lists for the Eagle.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 6, title: "TWIN TAIL",
    body: "Twin fins and twin nozzles. The Eagle's back end is symmetrical in a way the single-finned fleet is not.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 7, title: "SHOULDER WING",
    body: "A shoulder-mounted wing and a flat nose. The checklist pairs them because together they read as an Eagle.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 8, title: "SOURCE NOTE",
    body: "af.mil was unreachable during the sprite audit. The Eagle's figures were confirmed from secondary sources quoting the fact sheet, and the card says so.",
    source: `${ACC} sources`,
  },
  {
    n: 9, title: "BOSS DROP",
    body: "Chapter 6's boss hands over the Eagle.",
    source: "Design packet, boss briefs; src/data/campaign.ts BOSS_UNLOCKS",
  },
  {
    n: 10, title: "SILHOUETTE CHECK",
    body: "Square intakes, twin fins, twin nozzles, shoulder wing, flat nose: the five features audited for the Eagle.",
    source: `${ACC} silhouette checklist`,
  },
];

const F18_CARDS: IntelCard[] = [
  {
    n: 1, title: "F/A",
    body: "Fighter and attack in one airframe. That is what the F/A in the name means, and the fleet note says it first.",
    source: "Design packet, Fleet Sprites artboard",
  },
  {
    n: 2, title: "TWO SEATS",
    body: "The F model seats two. The E model, the one in this fleet, is a single-seater.",
    source: "Design packet, Fleet Sprites artboard",
  },
  {
    n: 3, title: "LENGTH",
    body: "60.3 ft — 18.5 m, 0.6 m shorter than the Tomcat and 0.9 m shorter than the Eagle.",
    source: `${ACC} — NAVAIR`,
  },
  {
    n: 4, title: "SPAN",
    body: "44.9 ft — 13.7 m, the widest span of any single-finned fighter in the fleet.",
    source: `${ACC} — NAVAIR`,
  },
  {
    n: 5, title: "HEIGHT",
    body: "16 ft — 4.9 m, level with the Tomcat.",
    source: `${ACC} — NAVAIR`,
  },
  {
    n: 6, title: "TOP SPEED",
    body: "Mach 1.8+ per NAVAIR. The plus sign is the fact sheet's, not the game rounding up.",
    source: `${ACC} — NAVAIR`,
  },
  {
    n: 7, title: "CANTED FINS",
    body: "The twin fins cant outward, so the tail reads as a V opening upward.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 8, title: "LERX",
    body: "Leading-edge root extensions run from the wing roots along the fuselage, feeding the wing at high angles.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 9, title: "WING FOLD",
    body: "A wing-fold line crosses each wing: the hinge the carrier needs, and the tell at 120 px.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 10, title: "SILHOUETTE CHECK",
    body: "Outward-canted twin fins, rectangular intakes, LERX, wing-fold line: the four features audited for the Super Hornet.",
    source: `${ACC} silhouette checklist`,
  },
];

const F117_CARDS: IntelCard[] = [
  {
    n: 1, title: "FACETED",
    body: "A faceted arrowhead: flat panel after flat panel, with no round surfaces anywhere on the airframe.",
    source: "Design packet, Fleet Sprites artboard; accuracy-check.md checklist",
  },
  {
    n: 2, title: "FLAT PANELS",
    body: "Every flat panel scatters radar rather than returning it. The shape itself is the stealth.",
    source: "Design packet, Fleet Sprites artboard",
  },
  {
    n: 3, title: "LENGTH",
    body: "65 ft 11 in — 20.1 m, the second-longest airframe in the fleet after the Blackbird.",
    source: `${ACC} — USAF fact sheet; computed from fleet figures`,
  },
  {
    n: 4, title: "SPAN",
    body: "43 ft 4 in — 13.2 m: 0.1 m wider than the Eagle's span and 0.4 m narrower than the Raptor's.",
    source: `${ACC} — USAF fact sheet`,
  },
  {
    n: 5, title: "HEIGHT",
    body: "12 ft 5 in — 3.8 m, the lowest airframe in the fleet, level with the Talon.",
    source: `${ACC} — USAF fact sheet; computed from fleet figures`,
  },
  {
    n: 6, title: "W TRAILING EDGE",
    body: "The trailing edge makes a W: two points flanking the exhaust, which is the shape the checklist names.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 7, title: "V-TAIL",
    body: "The tail is a V, with no vertical fin at all.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 8, title: "RATIO",
    body: "Span over length is 0.657, per the ratio table the sprite was measured against.",
    source: `${ACC} ratio table`,
  },
  {
    n: 9, title: "BOSS DROP",
    body: "Chapter 8's boss hands over the Nighthawk.",
    source: "Design packet, boss briefs; src/data/campaign.ts BOSS_UNLOCKS",
  },
  {
    n: 10, title: "SILHOUETTE CHECK",
    body: "Four features must survive at 120 px: the faceted arrowhead, the W trailing edge, the V-tail and the absence of any round surface.",
    source: `${ACC} silhouette checklist`,
  },
];

const F22_CARDS: IntelCard[] = [
  {
    n: 1, title: "THRUST VECTORING",
    body: "Its engines point their thrust where the pilot asks, so a Raptor can turn in ways a fin-and-rudder fighter cannot.",
    source: "Design packet, Fleet Sprites artboard",
  },
  {
    n: 2, title: "STEALTH THAT TURNS",
    body: "Stealth that turns: the fleet note's own phrase for a low-observable airframe still built to dogfight.",
    source: "Design packet, Fleet Sprites artboard",
  },
  {
    n: 3, title: "LENGTH",
    body: "62 ft 1 in — 18.9 m. Only the Nighthawk, Eagle, Phantom, Tomcat and Blackbird run longer.",
    source: `${ACC} — USAF / JBLE fact sheet`,
  },
  {
    n: 4, title: "SPAN",
    body: "44 ft 6 in — 13.6 m: 0.1 m narrower than the Super Hornet and the widest of the stealth airframes.",
    source: `${ACC} — USAF / JBLE fact sheet`,
  },
  {
    n: 5, title: "HEIGHT",
    body: "16 ft 8 in — 5.1 m, third-tallest in the fleet behind the Eagle and the Blackbird.",
    source: `${ACC} — USAF / JBLE fact sheet; computed from fleet figures`,
  },
  {
    n: 6, title: "TOP SPEED",
    body: "Mach two class, in the fact sheet's own words. The game prints the phrase rather than inventing a decimal.",
    source: `${ACC} — USAF / JBLE fact sheet`,
  },
  {
    n: 7, title: "DIAMOND WING",
    body: "A diamond wing, with the trailing edge cut inward in a way no single-finned airframe here shares.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 8, title: "2D NOZZLES",
    body: "Two-dimensional nozzles: rectangular exhausts that vector in the vertical plane.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 9, title: "SAWTOOTH EDGES",
    body: "Sawtooth panel edges all round and widely canted fins are the two features the checklist calls out.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 10, title: "SILHOUETTE CHECK",
    body: "Diamond wing, widely canted fins, 2D nozzles, sawtooth edges: the four features audited for the Raptor.",
    source: `${ACC} silhouette checklist`,
  },
];

const F35_CARDS: IntelCard[] = [
  {
    n: 1, title: "ONE AIRFRAME",
    body: "One airframe, three services. That is the design's own line for the Lightning II.",
    source: "Design packet, Fleet Sprites artboard",
  },
  {
    n: 2, title: "HELMET",
    body: "The helmet lets the pilot look down through the floor of the aircraft, because the airframe has no room for a second pair of eyes.",
    source: "Design packet, Fleet Sprites artboard",
  },
  {
    n: 3, title: "LENGTH",
    body: "51 ft — 15.7 m, the shortest fighter-length in the fleet bar the Falcon.",
    source: `${ACC} — ACC fact sheet; computed from fleet figures`,
  },
  {
    n: 4, title: "SPAN",
    body: "35 ft — 10.7 m, the second-narrowest span of any fighter in the fleet after the Falcon's 9.8 m.",
    source: `${ACC} — ACC fact sheet; computed from fleet figures`,
  },
  {
    n: 5, title: "HEIGHT",
    body: "14 ft — 4.4 m, the lowest of any airframe in the fleet with twin fins.",
    source: `${ACC} — ACC fact sheet`,
  },
  {
    n: 6, title: "TOP SPEED",
    body: "Mach 1.6, per the ACC fact sheet.",
    source: `${ACC} — ACC fact sheet`,
  },
  {
    n: 7, title: "DSI BUMPS",
    body: "Diverterless supersonic inlet bumps sit beside the forward fuselage, and the checklist names them among the features that must read at 120 px.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 8, title: "CANTED FINS",
    body: "The twin fins cant outward like the Super Hornet's, but the fuselage is far stubbier.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 9, title: "CANOPY AND WING",
    body: "A single large canopy over a trapezoid wing. The checklist's word for the whole airframe is stubby.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 10, title: "BOSS DROP",
    body: "Chapter 10's boss hands over the Lightning II, the last boss drop of the year.",
    source: "Design packet, boss briefs; src/data/campaign.ts BOSS_UNLOCKS",
  },
];

const SR71_CARDS: IntelCard[] = [
  {
    n: 1, title: "LONGEST",
    body: "107.4 ft — 32.7 m. Longer than the two shortest airframes in the fleet laid nose to tail.",
    source: `${ACC} — NASA Dryden fact sheet; computed from fleet figures`,
  },
  {
    n: 2, title: "SPAN",
    body: "55.6 ft — 16.9 m, 0.6 m short of the A-10's span despite being twice its length.",
    source: `${ACC} — NASA Dryden fact sheet`,
  },
  {
    n: 3, title: "HEIGHT",
    body: "18.5 ft — 5.6 m, level with the Eagle at the top of the fleet.",
    source: `${ACC} — NASA Dryden fact sheet; computed from fleet figures`,
  },
  {
    n: 4, title: "SPEED",
    body: "Mach 3+, with a design cruise of 3.2. The fastest figure in the fleet by a wide margin.",
    source: `${ACC} — NASA Dryden fact sheet`,
  },
  {
    n: 5, title: "ALTITUDE",
    body: "Cruise altitudes up to 85,000 ft, per the NASA Dryden fact sheet.",
    source: `${ACC} — NASA Dryden fact sheet`,
  },
  {
    n: 6, title: "GROWS IN HEAT",
    body: "It leaked fuel on the ground because it was built to grow in the heat of Mach 3.",
    source: "Design packet, Unlock reveal",
  },
  {
    n: 7, title: "CHINES",
    body: "Chines run the length of the forward fuselage as sharp edges rather than round sides.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 8, title: "NACELLES",
    body: "The engines ride in nacelles with spikes at the front, not buried inside the fuselage.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 9, title: "INWARD-CANTED FINS",
    body: "The fins sit on the nacelles and cant inward, the opposite of every other canted tail in the fleet.",
    source: `${ACC} silhouette checklist`,
  },
  {
    n: 10, title: "RATIO",
    body: "Span over length is 0.518, the narrowest planform in the fleet.",
    source: `${ACC} ratio table`,
  },
];

/* ----------------------------------------------------------- assembly */

const CARD_SETS: Record<string, IntelCard[]> = {
  t38: T38_CARDS,
  f4: F4_CARDS,
  a10: A10_CARDS,
  f16: F16_CARDS,
  f14: F14_CARDS,
  f15: F15_CARDS,
  f18: F18_CARDS,
  f117: F117_CARDS,
  f22: F22_CARDS,
  f35: F35_CARDS,
  sr71: SR71_CARDS,
};

/**
 * Every airframe in the fleet has a dossier, and its spec fields are the audited
 * fleet figures rather than a second copy that can drift out of step.
 */
export const DOSSIERS: Record<string, Dossier> = Object.fromEntries(
  FLEET.map((f) => [
    f.airframe,
    {
      airframe: f.airframe,
      designation: f.designation,
      name: f.name,
      lengthM: f.lengthM,
      spanM: f.spanM,
      heightM: f.heightM,
      engine: f.engines,
      topSpeed: f.topSpeed,
      crew: f.crew,
      cards: CARD_SETS[f.airframe] ?? [],
    },
  ]),
);

export function dossier(airframe: string): Dossier | null {
  return DOSSIERS[airframe] ?? null;
}