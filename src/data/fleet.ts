// The fleet spec sheet (Screens 09B).
//
// Every figure here comes from design/accuracy-check.md, which cites US
// government fact sheets for each airframe and was the audit the sprites were
// drawn against. Nothing is filled in from memory: where that document does not
// list a speed, this table does not state one, and the screen shows a dash.
//
// Feet and inches are converted to metres and rounded to one decimal place,
// which is the precision the fact sheets themselves publish.

export interface FleetEntry {
  airframe: string;
  designation: string;
  name: string;
  /** metres */
  lengthM: number;
  spanM: number;
  heightM: number;
  crew: number;
  engines: string;
  /** null when design/accuracy-check.md does not give one */
  topSpeed: string | null;
  /** one line, the thing worth knowing */
  note: string;
  /** alternative liveries that exist as sprites, by id */
  liveries: { id: string; label: string }[];
}

/** In the design's unlock order. */
export const FLEET: FleetEntry[] = [
  {
    airframe: "t38", designation: "T-38", name: "TALON",
    lengthM: 14.0, spanM: 7.6, heightM: 3.8, crew: 2,
    engines: "2 × TURBOJET", topSpeed: "812 MPH · MACH 1.08 AT SEA LEVEL",
    note: "The trainer. Two seats, one instructor, and the aircraft most USAF pilots learn on.",
    liveries: [{ id: "nasa", label: "NASA" }],
  },
  {
    airframe: "f4", designation: "F-4E", name: "PHANTOM II",
    lengthM: 19.2, spanM: 11.7, heightM: 5.0, crew: 2,
    engines: "2 × TURBOJET", topSpeed: null,
    note: "Tandem canopy, side intakes, a dogtooth wing and one tall fin. The E model finally got a gun.",
    liveries: [],
  },
  {
    airframe: "a10", designation: "A-10C", name: "THUNDERBOLT II",
    lengthM: 16.3, spanM: 17.5, heightM: 4.5, crew: 1,
    engines: "2 × TURBOFAN", topSpeed: null,
    note: "Wider across the wings than it is long, and the whole aircraft built around its gun.",
    liveries: [],
  },
  {
    airframe: "f16", designation: "F-16C", name: "FIGHTING FALCON",
    lengthM: 14.8, spanM: 9.8, heightM: 4.8, crew: 1,
    engines: "1 × TURBOFAN", topSpeed: "MACH 2 AT ALTITUDE",
    note: "One engine, one seat, one fin. The first fly-by-wire fighter in service; first flew December 1976.",
    liveries: [],
  },
  {
    airframe: "f14", designation: "F-14", name: "TOMCAT",
    lengthM: 19.1, spanM: 19.5, heightM: 4.9, crew: 2,
    engines: "2 × TURBOFAN", topSpeed: null,
    note: "Span given unswept. Swept back it narrows to 11.6 m, which is how it fits on a carrier deck.",
    liveries: [],
  },
  {
    airframe: "f15", designation: "F-15C", name: "EAGLE",
    lengthM: 19.4, spanM: 13.1, heightM: 5.6, crew: 1,
    engines: "2 × TURBOFAN", topSpeed: null,
    note: "The tallest airframe in the fleet, and the one with the most wing for its weight.",
    liveries: [],
  },
  {
    airframe: "f18", designation: "F/A-18E", name: "SUPER HORNET",
    lengthM: 18.5, spanM: 13.7, heightM: 4.9, crew: 1,
    engines: "2 × TURBOFAN", topSpeed: "MACH 1.8+",
    note: "Fighter and attack in one airframe, which is what the F/A in the name means. The F model seats two.",
    liveries: [{ id: "blueangels", label: "BLUE ANGELS" }],
  },
  {
    airframe: "f117", designation: "F-117", name: "NIGHTHAWK",
    lengthM: 20.1, spanM: 13.2, heightM: 3.8, crew: 1,
    engines: "2 × TURBOFAN", topSpeed: null,
    note: "A faceted arrowhead with a V-tail and no round surfaces anywhere. Every flat panel scatters radar.",
    liveries: [],
  },
  {
    airframe: "f22", designation: "F-22A", name: "RAPTOR",
    lengthM: 18.9, spanM: 13.6, heightM: 5.1, crew: 1,
    engines: "2 × TURBOFAN", topSpeed: "MACH TWO CLASS",
    note: "Stealth that turns. Its engines point their thrust where the pilot asks.",
    liveries: [],
  },
  {
    airframe: "f35", designation: "F-35A", name: "LIGHTNING II",
    lengthM: 15.7, spanM: 10.7, heightM: 4.4, crew: 1,
    engines: "1 × TURBOFAN", topSpeed: "MACH 1.6",
    note: "One airframe, three services. The helmet lets the pilot look down through the floor.",
    liveries: [],
  },
  {
    airframe: "sr71", designation: "SR-71", name: "BLACKBIRD",
    lengthM: 32.7, spanM: 16.9, heightM: 5.6, crew: 2,
    engines: "2 × TURBOJET / RAMJET", topSpeed: "MACH 3+ · DESIGN CRUISE 3.2",
    note: "More than twice as long as the Talon, and cruising at 85,000 ft. It grew in the heat of Mach 3.",
    liveries: [],
  },
];

export const fleetEntry = (airframe: string): FleetEntry | null =>
  FLEET.find((f) => f.airframe === airframe) ?? null;

/** Shown at the foot of the spec sheet, because the figures are real. */
export const FLEET_SOURCE =
  "Dimensions from USAF, NAVAIR, NASA and National Museum fact sheets, as audited in design/accuracy-check.md. A dash means that document does not give a figure.";
