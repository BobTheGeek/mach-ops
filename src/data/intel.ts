// Intel cards: ten per airframe, real facts about the real aircraft.
//
// design/README.md: "Aircraft facts only from official sources; give dimensions
// in metres with one decimal." Every card below carries the source it came from,
// and every source is either a US government fact sheet quoted in
// design/accuracy-check.md or the design packet's own artboard copy. Nothing
// here is written from memory.
//
// Earning rule (Screens 08, How to Play HP5): a sortie completed with 6 or more
// first-try hits earns one card.

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
  topSpeed: string;
  crew: number;
  cards: IntelCard[];
}

const T38: Dossier = {
  airframe: "t38",
  designation: "T-38",
  name: "TALON",
  lengthM: 14.0,
  spanM: 7.6,
  heightM: 3.8,
  engine: "2 × TURBOJET",
  topSpeed: "MACH 1.08",
  crew: 2,
  cards: [
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
  ],
};

export const DOSSIERS: Record<string, Dossier> = { t38: T38 };

export function dossier(airframe: string): Dossier | null {
  return DOSSIERS[airframe] ?? null;
}
