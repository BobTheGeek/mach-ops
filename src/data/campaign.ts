// Chapter 1 campaign: the mission list the hangar shows and the briefing and
// sortie scenes are configured from.
//
// design/README.md build plan, Phase 2: "Ch 1 campaign (8-12 missions)". Ten
// sorties, each leaning on one Chapter 1 skill until the last three mix, then a
// boss sortie of mixed review (11 Boss briefing: amber frame, higher stakes).

export type MissionKind = "intercept" | "patrol" | "boss";

export interface Mission {
  id: string;
  /** sortie number inside the chapter, 1-based */
  n: number;
  unitId: string;
  /** callsign-style mission name, caps in the UI */
  name: string;
  /** one line of pilot-facing briefing copy */
  brief: string;
  kind: MissionKind;
  /** skills this sortie leans on; empty means the whole chapter */
  focus: string[];
  /** prep problems before launch */
  prep: number;
  /** problems in the sortie itself */
  problems: number;
  /** bogeys on station */
  bogeys: number;
  /** seconds of fuel */
  fuelSeconds: number;
}

/**
 * Sorties 1-5 introduce one skill each in registry order; 6-9 mix; 10 is the
 * unit boss. Problem counts climb so the last sorties are the long ones.
 */
export const CH1_MISSIONS: Mission[] = [
  {
    id: "ch1-01", n: 1, unitId: "ch1", name: "FIRST LIGHT", kind: "intercept",
    brief: "Two contacts on the tape, one above you and one below. Read the altitudes and call the higher one.",
    focus: ["ns.1.1"], prep: 2, problems: 6, bogeys: 3, fuelSeconds: 240,
  },
  {
    id: "ch1-02", n: 2, unitId: "ch1", name: "COLD START", kind: "intercept",
    brief: "Climb and descent legs stack up fast. Total them as you go.",
    focus: ["ns.1.2"], prep: 2, problems: 6, bogeys: 3, fuelSeconds: 240,
  },
  {
    id: "ch1-03", n: 3, unitId: "ch1", name: "TANKER TRACK", kind: "intercept",
    brief: "Fuel reads in tenths. Same sign rules, new numbers.",
    focus: ["ns.1.3"], prep: 2, problems: 7, bogeys: 3, fuelSeconds: 260,
  },
  {
    id: "ch1-04", n: 4, unitId: "ch1", name: "DIVE RECOVERY", kind: "intercept",
    brief: "You are going down fast. Change is final minus initial, and it can be negative.",
    focus: ["ns.1.4"], prep: 2, problems: 7, bogeys: 3, fuelSeconds: 260,
  },
  {
    id: "ch1-05", n: 5, unitId: "ch1", name: "VERTICAL SPLIT", kind: "intercept",
    brief: "A surface contact below you and a bogey above. How far apart, on the vertical tape.",
    focus: ["ns.1.5"], prep: 3, problems: 8, bogeys: 3, fuelSeconds: 280,
  },
  {
    id: "ch1-06", n: 6, unitId: "ch1", name: "MIXED PATROL", kind: "patrol",
    brief: "No single system today. Everything Chapter 1 has taught you, in any order.",
    focus: [], prep: 3, problems: 9, bogeys: 3, fuelSeconds: 300,
  },
  {
    id: "ch1-07", n: 7, unitId: "ch1", name: "NIGHT WORK", kind: "intercept",
    brief: "The engine leans on whatever is weakest. Expect the ones you have been missing.",
    focus: [], prep: 3, problems: 10, bogeys: 3, fuelSeconds: 300,
  },
  {
    id: "ch1-08", n: 8, unitId: "ch1", name: "DEEP RANGE", kind: "patrol",
    brief: "Long leg, thin fuel margin. Keep the streak alive.",
    focus: [], prep: 3, problems: 11, bogeys: 3, fuelSeconds: 320,
  },
  {
    id: "ch1-09", n: 9, unitId: "ch1", name: "SHAKEDOWN", kind: "intercept",
    brief: "Last check before the qualification. Transfer problems are in the deck.",
    focus: [], prep: 3, problems: 12, bogeys: 3, fuelSeconds: 320,
  },
  {
    id: "ch1-10", n: 10, unitId: "ch1", name: "TALON QUALIFICATION", kind: "boss",
    brief: "Unit 1 boss sortie. Mixed review of every Chapter 1 system. Failure keeps all progress.",
    focus: [], prep: 3, problems: 12, bogeys: 3, fuelSeconds: 360,
  },
];

/**
 * Chapter 2. Same shape as Chapter 1: one sortie per skill, then mixed work, then
 * the unit boss. Chapter 2 is the multiply-and-divide unit, so the boss unlocks
 * the F-4E (DESIGN_RECONCILIATION section 4 unlock chain).
 */
export const CH2_MISSIONS: Mission[] = [
  {
    id: "ch2-01", n: 1, unitId: "ch2", name: "THRUST GATE", kind: "intercept",
    brief: "Rate times time. Count the negatives before you multiply anything.",
    focus: ["ns.2.1"], prep: 2, problems: 6, bogeys: 3, fuelSeconds: 240,
  },
  {
    id: "ch2-02", n: 2, unitId: "ch2", name: "AVERAGE DESCENT", kind: "intercept",
    brief: "A total over a time gives a rate. Same sign rule, the other direction.",
    focus: ["ns.2.2"], prep: 2, problems: 6, bogeys: 3, fuelSeconds: 240,
  },
  {
    id: "ch2-03", n: 3, unitId: "ch2", name: "GAUGE CHECK", kind: "intercept",
    brief: "The mechanical gauge and the digital readout must agree. Long division decides.",
    focus: ["ns.2.3"], prep: 2, problems: 7, bogeys: 3, fuelSeconds: 260,
  },
  {
    id: "ch2-04", n: 4, unitId: "ch2", name: "PARTIAL LOAD", kind: "intercept",
    brief: "Fractions of a tank, several legs. Decide the sign first, then simplify.",
    focus: ["ns.2.4"], prep: 2, problems: 8, bogeys: 3, fuelSeconds: 280,
  },
  {
    id: "ch2-05", n: 5, unitId: "ch2", name: "TANK SPLIT", kind: "intercept",
    brief: "Keep, change, flip. A complex fraction is a division problem in disguise.",
    focus: ["ns.2.5"], prep: 3, problems: 8, bogeys: 3, fuelSeconds: 280,
  },
  {
    id: "ch2-06", n: 6, unitId: "ch2", name: "ENGINE MAP", kind: "patrol",
    brief: "Everything Chapter 2 has taught you, in any order.",
    focus: [], prep: 3, problems: 9, bogeys: 3, fuelSeconds: 300,
  },
  {
    id: "ch2-07", n: 7, unitId: "ch2", name: "LONG LEG", kind: "intercept",
    brief: "The engine leans on whatever is weakest, Chapter 1 included.",
    focus: [], prep: 3, problems: 10, bogeys: 3, fuelSeconds: 300,
  },
  {
    id: "ch2-08", n: 8, unitId: "ch2", name: "HIGH ALPHA", kind: "patrol",
    brief: "Thin margins and honors problems in the deck. Keep the streak alive.",
    focus: [], prep: 3, problems: 11, bogeys: 3, fuelSeconds: 320,
  },
  {
    id: "ch2-09", n: 9, unitId: "ch2", name: "PRE-QUAL", kind: "intercept",
    brief: "Last check before the qualification. Transfer problems are in the deck.",
    focus: [], prep: 3, problems: 12, bogeys: 3, fuelSeconds: 320,
  },
  {
    id: "ch2-10", n: 10, unitId: "ch2", name: "PHANTOM QUALIFICATION", kind: "boss",
    brief: "Unit 2 boss sortie. Mixed review of Chapters 1 and 2. Passing earns the F-4E.",
    focus: [], prep: 3, problems: 12, bogeys: 3, fuelSeconds: 360,
  },
];

/**
 * Chapter 3, Expressions. Four skills, so the first four sorties introduce one
 * each and the rest mix; the boss unlocks the A-10C.
 */
export const CH3_MISSIONS: Mission[] = [
  {
    id: "ch3-01", n: 1, unitId: "ch3", name: "LOADOUT SHEET", kind: "intercept",
    brief: "Letters stand for weights you do not know yet. Collect the like terms and leave the rest alone.",
    focus: ["ee.3.1"], prep: 2, problems: 6, bogeys: 3, fuelSeconds: 240,
  },
  {
    id: "ch3-02", n: 2, unitId: "ch3", name: "WEIGHT DELTA", kind: "intercept",
    brief: "Two loadouts, one difference. Subtracting an expression flips every sign inside it.",
    focus: ["ee.3.2"], prep: 2, problems: 7, bogeys: 3, fuelSeconds: 260,
  },
  {
    id: "ch3-03", n: 3, unitId: "ch3", name: "SQUADRON MATH", kind: "intercept",
    brief: "Several identical flights. The number outside the brackets multiplies everything inside.",
    focus: ["ee.3.3"], prep: 2, problems: 7, bogeys: 3, fuelSeconds: 260,
  },
  {
    id: "ch3-04", n: 4, unitId: "ch3", name: "REGROUP", kind: "intercept",
    brief: "Distributing, run backwards. Pull out the biggest thing both terms share.",
    focus: ["ee.3.4"], prep: 3, problems: 8, bogeys: 3, fuelSeconds: 280,
  },
  {
    id: "ch3-05", n: 5, unitId: "ch3", name: "MIXED EXPRESSIONS", kind: "patrol",
    brief: "No single method today. Everything Chapter 3 has taught you, in any order.",
    focus: [], prep: 3, problems: 9, bogeys: 3, fuelSeconds: 300,
  },
  {
    id: "ch3-06", n: 6, unitId: "ch3", name: "CARRIER TRAP", kind: "intercept",
    brief: "The engine leans on whatever is weakest, Chapters 1 and 2 included.",
    focus: [], prep: 3, problems: 10, bogeys: 3, fuelSeconds: 300,
  },
  {
    id: "ch3-07", n: 7, unitId: "ch3", name: "HIGH GROUND", kind: "patrol",
    brief: "Honors exponent work is in the deck. Keep the streak alive.",
    focus: [], prep: 3, problems: 11, bogeys: 3, fuelSeconds: 320,
  },
  {
    id: "ch3-08", n: 8, unitId: "ch3", name: "PRE-QUAL", kind: "intercept",
    brief: "Last check before the qualification. Transfer problems are in the deck.",
    focus: [], prep: 3, problems: 12, bogeys: 3, fuelSeconds: 320,
  },
  {
    id: "ch3-09", n: 9, unitId: "ch3", name: "WARTHOG QUALIFICATION", kind: "boss",
    brief: "Unit 3 boss sortie. Mixed review of Chapters 1 to 3. Passing earns the A-10C.",
    focus: [], prep: 3, problems: 12, bogeys: 3, fuelSeconds: 360,
  },
];

/**
 * Chapter 4, Equations and Inequalities. Seven skills, so the first seven
 * sorties introduce one each; the boss unlocks the F-16C.
 */
export const CH4_MISSIONS: Mission[] = [
  {
    id: "ch4-01", n: 1, unitId: "ch4", name: "BALANCE CHECK", kind: "intercept",
    brief: "An equation is a balance. Whatever you do to one side, do to the other.",
    focus: ["ee.4.1"], prep: 2, problems: 6, bogeys: 3, fuelSeconds: 240,
  },
  {
    id: "ch4-02", n: 2, unitId: "ch4", name: "RATE SOLVE", kind: "intercept",
    brief: "Rate times time. Undo a multiplication by dividing, both sides at once.",
    focus: ["ee.4.2"], prep: 2, problems: 6, bogeys: 3, fuelSeconds: 240,
  },
  {
    id: "ch4-03", n: 3, unitId: "ch4", name: "TWO STEP", kind: "intercept",
    brief: "Two things done to x. Undo them in the opposite order to how they were done.",
    focus: ["ee.4.3"], prep: 2, problems: 7, bogeys: 3, fuelSeconds: 260,
  },
  {
    id: "ch4-04", n: 4, unitId: "ch4", name: "LIMITS", kind: "intercept",
    brief: "Not one answer but a range. At least, at most, and which circle to draw.",
    focus: ["ee.4.4"], prep: 2, problems: 7, bogeys: 3, fuelSeconds: 260,
  },
  {
    id: "ch4-05", n: 5, unitId: "ch4", name: "MARGIN CALL", kind: "intercept",
    brief: "Inequalities solve like equations. Adding never moves the symbol.",
    focus: ["ee.4.5"], prep: 3, problems: 8, bogeys: 3, fuelSeconds: 280,
  },
  {
    id: "ch4-06", n: 6, unitId: "ch4", name: "REVERSE THRUST", kind: "intercept",
    brief: "Divide by a negative and the symbol flips. Nothing else flips it.",
    focus: ["ee.4.6"], prep: 3, problems: 9, bogeys: 3, fuelSeconds: 300,
  },
  {
    id: "ch4-07", n: 7, unitId: "ch4", name: "MAX ORDNANCE", kind: "intercept",
    brief: "Two steps, the flip rule, and an answer you have to read back into the world.",
    focus: ["ee.4.7"], prep: 3, problems: 10, bogeys: 3, fuelSeconds: 300,
  },
  {
    id: "ch4-08", n: 8, unitId: "ch4", name: "MIXED SOLVE", kind: "patrol",
    brief: "Everything Chapter 4 has taught you, in any order, with honors work in the deck.",
    focus: [], prep: 3, problems: 11, bogeys: 3, fuelSeconds: 320,
  },
  {
    id: "ch4-09", n: 9, unitId: "ch4", name: "PRE-QUAL", kind: "intercept",
    brief: "Last check before the qualification. Transfer problems are in the deck.",
    focus: [], prep: 3, problems: 12, bogeys: 3, fuelSeconds: 320,
  },
  {
    id: "ch4-10", n: 10, unitId: "ch4", name: "FALCON QUALIFICATION", kind: "boss",
    brief: "Unit 4 boss sortie. Mixed review of Chapters 1 to 4. Passing earns the F-16C.",
    focus: [], prep: 3, problems: 14, bogeys: 3, fuelSeconds: 380,
  },
];

export const MISSIONS: Mission[] = [...CH1_MISSIONS, ...CH2_MISSIONS, ...CH3_MISSIONS, ...CH4_MISSIONS];

export function missionsFor(unitId: string): Mission[] {
  return MISSIONS.filter((m) => m.unitId === unitId).sort((a, b) => a.n - b.n);
}

export function mission(id: string): Mission {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m) throw new Error(`unknown mission ${id}`);
  return m;
}
