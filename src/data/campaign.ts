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

/**
 * Chapter 5, Ratios and Proportions. Six skills, so six sorties introduce one
 * each; the boss unlocks the F-14. Eleven Grade 8 honors skills hang off this
 * chapter, so the mixed sorties carry the heaviest honors decks in the game.
 */
export const CH5_MISSIONS: Mission[] = [
  {
    id: "ch5-01", n: 1, unitId: "ch5", name: "FUEL LADDER", kind: "intercept",
    brief: "A ratio table of fuel against distance. Scale both rows together, never add to one.",
    focus: ["rp.5.1"], prep: 2, problems: 6, bogeys: 3, fuelSeconds: 240,
  },
  {
    id: "ch5-02", n: 2, unitId: "ch5", name: "BURN RATE", kind: "intercept",
    brief: "Litres per minute, kilometres per litre. Divide to get one, and keep the units on.",
    focus: ["rp.5.2"], prep: 2, problems: 6, bogeys: 3, fuelSeconds: 240,
  },
  {
    id: "ch5-03", n: 3, unitId: "ch5", name: "STRAIGHT AND TRUE", kind: "intercept",
    brief: "Some tables are a steady rate and some are not. Check every row, then check the origin.",
    focus: ["rp.5.3"], prep: 2, problems: 7, bogeys: 3, fuelSeconds: 260,
  },
  {
    id: "ch5-04", n: 4, unitId: "ch5", name: "LONG LEG", kind: "intercept",
    brief: "Write the proportion with the units lined up, then scale or cross multiply.",
    focus: ["rp.5.4"], prep: 2, problems: 7, bogeys: 3, fuelSeconds: 260,
  },
  {
    id: "ch5-05", n: 5, unitId: "ch5", name: "PLOT THE CLIMB", kind: "intercept",
    brief: "A proportional line goes through the origin. Read k at x = 1 and write y = kx.",
    focus: ["rp.5.5"], prep: 3, problems: 8, bogeys: 3, fuelSeconds: 280,
  },
  {
    id: "ch5-06", n: 6, unitId: "ch5", name: "MAP READ", kind: "intercept",
    brief: "One centimetre on the chart is kilometres on the ground. Areas scale twice over.",
    focus: ["rp.5.6"], prep: 3, problems: 9, bogeys: 3, fuelSeconds: 300,
  },
  {
    id: "ch5-07", n: 7, unitId: "ch5", name: "CROSS CHECK", kind: "patrol",
    brief: "Tables, graphs and equations for the same rate. Move between them without losing the units.",
    focus: [], prep: 3, problems: 10, bogeys: 3, fuelSeconds: 300,
  },
  {
    id: "ch5-08", n: 8, unitId: "ch5", name: "MIXED TRACK", kind: "patrol",
    brief: "Everything Chapter 5 has taught you, in any order, with honors work in the deck.",
    focus: [], prep: 3, problems: 11, bogeys: 3, fuelSeconds: 320,
  },
  {
    id: "ch5-09", n: 9, unitId: "ch5", name: "PRE-QUAL", kind: "intercept",
    brief: "Last check before the qualification. Transfer problems are in the deck.",
    focus: [], prep: 3, problems: 12, bogeys: 3, fuelSeconds: 320,
  },
  {
    id: "ch5-10", n: 10, unitId: "ch5", name: "TOMCAT QUALIFICATION", kind: "boss",
    brief: "Unit 5 boss sortie. Mixed review of Chapters 1 to 5. Passing earns the F-14.",
    focus: [], prep: 3, problems: 14, bogeys: 3, fuelSeconds: 380,
  },
];

/**
 * Chapter 6, Percents. Six skills and six introducing sorties. Every skill here
 * is the same equation in different clothes, so the mixed sorties matter more
 * than usual: telling the four questions apart is the real work. Boss unlocks
 * the F-15C.
 */
export const CH6_MISSIONS: Mission[] = [
  {
    id: "ch6-01", n: 1, unitId: "ch6", name: "GAUGE READ", kind: "intercept",
    brief: "The same amount as a fraction, a decimal and a percent. Move the point two places, the right way.",
    focus: ["rp.6.1"], prep: 2, problems: 6, bogeys: 3, fuelSeconds: 240,
  },
  {
    id: "ch6-02", n: 2, unitId: "ch6", name: "PART AND WHOLE", kind: "intercept",
    brief: "Part over whole equals percent over 100. Find the whole first: it is what the percent is of.",
    focus: ["rp.6.2"], prep: 2, problems: 6, bogeys: 3, fuelSeconds: 240,
  },
  {
    id: "ch6-03", n: 3, unitId: "ch6", name: "BASE SHOP", kind: "intercept",
    brief: "Price times the rate as a decimal. Tax and fees are added on top, not instead.",
    focus: ["rp.6.3"], prep: 2, problems: 7, bogeys: 3, fuelSeconds: 260,
  },
  {
    id: "ch6-04", n: 4, unitId: "ch6", name: "DELTA CHECK", kind: "intercept",
    brief: "How big was the change compared with where you started? Always divide by the original.",
    focus: ["rp.6.4"], prep: 2, problems: 7, bogeys: 3, fuelSeconds: 260,
  },
  {
    id: "ch6-05", n: 5, unitId: "ch6", name: "CLEARANCE SALE", kind: "intercept",
    brief: "A quarter off means you pay three quarters. One multiplication, not two steps.",
    focus: ["rp.6.5"], prep: 3, problems: 8, bogeys: 3, fuelSeconds: 280,
  },
  {
    id: "ch6-06", n: 6, unitId: "ch6", name: "CREDIT LINE", kind: "intercept",
    brief: "Interest is principal times rate times time, with the rate as a decimal and the time in years.",
    focus: ["rp.6.6"], prep: 3, problems: 9, bogeys: 3, fuelSeconds: 300,
  },
  {
    id: "ch6-07", n: 7, unitId: "ch6", name: "INVOICE RUN", kind: "patrol",
    brief: "Four questions that look alike. Decide what is being asked before you multiply anything.",
    focus: [], prep: 3, problems: 10, bogeys: 3, fuelSeconds: 300,
  },
  {
    id: "ch6-08", n: 8, unitId: "ch6", name: "MIXED LEDGER", kind: "patrol",
    brief: "Everything Chapter 6 has taught you, in any order, with honors work in the deck.",
    focus: [], prep: 3, problems: 11, bogeys: 3, fuelSeconds: 320,
  },
  {
    id: "ch6-09", n: 9, unitId: "ch6", name: "PRE-QUAL", kind: "intercept",
    brief: "Last check before the qualification. Transfer problems are in the deck.",
    focus: [], prep: 3, problems: 12, bogeys: 3, fuelSeconds: 320,
  },
  {
    id: "ch6-10", n: 10, unitId: "ch6", name: "EAGLE QUALIFICATION", kind: "boss",
    brief: "Unit 6 boss sortie. Mixed review of Chapters 1 to 6. Passing earns the F-15C.",
    focus: [], prep: 3, problems: 15, bogeys: 3, fuelSeconds: 400,
  },
];

/**
 * Chapter 7, Probability and Statistical Measures. Six skills, so six sorties
 * introduce one each; the boss unlocks the F/A-18E. The two Grade 8 honors
 * probability skills hang off this chapter and ride in the mixed decks.
 */
export const CH7_MISSIONS: Mission[] = [
  {
    id: "ch7-01", n: 1, unitId: "ch7", name: "LONG ODDS", kind: "intercept",
    brief: "Count the outcomes, count the ones you want, and put one over the other. Never above 1.",
    focus: ["sp.7.1"], prep: 2, problems: 6, bogeys: 3, fuelSeconds: 240,
  },
  {
    id: "ch7-02", n: 2, unitId: "ch7", name: "LIVE FIRE LOG", kind: "intercept",
    brief: "What should happen against what did happen. A short run wanders; a long run settles.",
    focus: ["sp.7.2"], prep: 2, problems: 6, bogeys: 3, fuelSeconds: 240,
  },
  {
    id: "ch7-03", n: 3, unitId: "ch7", name: "CENTRE MASS", kind: "intercept",
    brief: "Mean, median and mode. Sort the list before you go looking for the middle of it.",
    focus: ["sp.7.3"], prep: 2, problems: 7, bogeys: 3, fuelSeconds: 260,
  },
  {
    id: "ch7-04", n: 4, unitId: "ch7", name: "SCATTER CHECK", kind: "intercept",
    brief: "Two squadrons can share a mean and be nothing alike. Range, quartiles, IQR.",
    focus: ["sp.7.4"], prep: 2, problems: 7, bogeys: 3, fuelSeconds: 260,
  },
  {
    id: "ch7-05", n: 5, unitId: "ch7", name: "ONE BAD SORTIE", kind: "intercept",
    brief: "One abort drags the mean and leaves the median alone. Let the shape pick the measure.",
    focus: ["sp.7.5"], prep: 3, problems: 8, bogeys: 3, fuelSeconds: 280,
  },
  {
    id: "ch7-06", n: 6, unitId: "ch7", name: "FIVE NUMBERS", kind: "intercept",
    brief: "A whole data set in five numbers and one box. Every section holds a quarter of it.",
    focus: ["sp.7.6"], prep: 3, problems: 9, bogeys: 3, fuelSeconds: 300,
  },
  {
    id: "ch7-07", n: 7, unitId: "ch7", name: "DATA SWEEP", kind: "patrol",
    brief: "Centre and spread on the same data, read off tables, dot plots and box plots.",
    focus: [], prep: 3, problems: 10, bogeys: 3, fuelSeconds: 300,
  },
  {
    id: "ch7-08", n: 8, unitId: "ch7", name: "MIXED ODDS", kind: "patrol",
    brief: "Everything Chapter 7 has taught you, in any order, with compound-event honors work in the deck.",
    focus: [], prep: 3, problems: 11, bogeys: 3, fuelSeconds: 320,
  },
  {
    id: "ch7-09", n: 9, unitId: "ch7", name: "PRE-QUAL", kind: "intercept",
    brief: "Last check before the qualification. Transfer problems are in the deck.",
    focus: [], prep: 3, problems: 12, bogeys: 3, fuelSeconds: 320,
  },
  {
    id: "ch7-10", n: 10, unitId: "ch7", name: "HORNET QUALIFICATION", kind: "boss",
    brief: "Unit 7 boss sortie. Mixed review of Chapters 1 to 7. Passing earns the F/A-18E.",
    focus: [], prep: 3, problems: 15, bogeys: 3, fuelSeconds: 400,
  },
];

/**
 * Chapter 8, Statistics. Four skills and four introducing sorties, so the mixed
 * half of the unit is longer than usual: the whole chapter is one argument,
 * from how you take a sample to what you are allowed to conclude from it. The
 * boss unlocks the F-117.
 */
export const CH8_MISSIONS: Mission[] = [
  {
    id: "ch8-01", n: 1, unitId: "ch8", name: "WHO ASKED", kind: "intercept",
    brief: "You cannot ask everybody. A sample only counts if everyone had an equal chance of being in it.",
    focus: ["sp.8.1"], prep: 2, problems: 6, bogeys: 3, fuelSeconds: 240,
  },
  {
    id: "ch8-02", n: 2, unitId: "ch8", name: "SCALE UP", kind: "intercept",
    brief: "Sixty missiles checked, two thousand four hundred in the depot. Scale the share, not the count.",
    focus: ["sp.8.2"], prep: 2, problems: 7, bogeys: 3, fuelSeconds: 260,
  },
  {
    id: "ch8-03", n: 3, unitId: "ch8", name: "SQUADRON MATCH", kind: "intercept",
    brief: "A gap of three minutes means a lot or nothing at all. Measure it against the spread.",
    focus: ["sp.8.3"], prep: 3, problems: 8, bogeys: 3, fuelSeconds: 280,
  },
  {
    id: "ch8-04", n: 4, unitId: "ch8", name: "FLY-OFF", kind: "intercept",
    brief: "Two samples, two box plots. Say what you found and say how sure you are.",
    focus: ["sp.8.4"], prep: 3, problems: 9, bogeys: 3, fuelSeconds: 300,
  },
  {
    id: "ch8-05", n: 5, unitId: "ch8", name: "TREND LINE", kind: "patrol",
    brief: "Scatter plots and two-way tables. Honors work: association, outliers and shares.",
    focus: [], prep: 3, problems: 10, bogeys: 3, fuelSeconds: 300,
  },
  {
    id: "ch8-06", n: 6, unitId: "ch8", name: "SAMPLE RUN", kind: "patrol",
    brief: "From a sampling method to a conclusion, on one set of data, without overclaiming.",
    focus: [], prep: 3, problems: 11, bogeys: 3, fuelSeconds: 320,
  },
  {
    id: "ch8-07", n: 7, unitId: "ch8", name: "MIXED STATS", kind: "patrol",
    brief: "Everything Chapters 7 and 8 have taught you, in any order, with honors work in the deck.",
    focus: [], prep: 3, problems: 12, bogeys: 3, fuelSeconds: 340,
  },
  {
    id: "ch8-08", n: 8, unitId: "ch8", name: "PRE-QUAL", kind: "intercept",
    brief: "Last check before the qualification. Transfer problems are in the deck.",
    focus: [], prep: 3, problems: 13, bogeys: 3, fuelSeconds: 340,
  },
  {
    id: "ch8-09", n: 9, unitId: "ch8", name: "NIGHTHAWK QUALIFICATION", kind: "boss",
    brief: "Unit 8 boss sortie. Mixed review of Chapters 1 to 8. Passing earns the F-117.",
    focus: [], prep: 3, problems: 16, bogeys: 3, fuelSeconds: 420,
  },
];

/**
 * Chapter 9, Geometric Shapes and Angles. Five skills and five introducing
 * sorties. Five of the seven Grade 8 honors geometry skills hang off this
 * chapter, so the mixed sorties carry Pythagoras and the transversal rules on
 * top of the Grade 7 work. The boss unlocks the F-22A.
 */
export const CH9_MISSIONS: Mission[] = [
  {
    id: "ch9-01", n: 1, unitId: "ch9", name: "HOLDING PATTERN", kind: "intercept",
    brief: "Round the circle is π times across it. Sort out the radius from the diameter first.",
    focus: ["g.9.1"], prep: 2, problems: 6, bogeys: 3, fuelSeconds: 240,
  },
  {
    id: "ch9-02", n: 2, unitId: "ch9", name: "SWEEP AREA", kind: "intercept",
    brief: "Square the radius, then multiply by π. Double the range and you cover four times the ground.",
    focus: ["g.9.2"], prep: 2, problems: 6, bogeys: 3, fuelSeconds: 240,
  },
  {
    id: "ch9-03", n: 3, unitId: "ch9", name: "APRON SURVEY", kind: "intercept",
    brief: "Cut the shape into pieces you know. Perimeter counts only the outside edges.",
    focus: ["g.9.3"], prep: 2, problems: 7, bogeys: 3, fuelSeconds: 260,
  },
  {
    id: "ch9-04", n: 4, unitId: "ch9", name: "CLOSE THE CIRCUIT", kind: "intercept",
    brief: "Three legs only close if the two short ones beat the long one. Equal is a straight line.",
    focus: ["g.9.4"], prep: 3, problems: 8, bogeys: 3, fuelSeconds: 280,
  },
  {
    id: "ch9-05", n: 5, unitId: "ch9", name: "CROSSING TRACKS", kind: "intercept",
    brief: "Name the relationship, write the equation, solve it — then answer the angle, not x.",
    focus: ["g.9.5"], prep: 3, problems: 9, bogeys: 3, fuelSeconds: 300,
  },
  {
    id: "ch9-06", n: 6, unitId: "ch9", name: "RIGHT ANGLES", kind: "patrol",
    brief: "Honors work: squares on the sides, missing lengths, and distance across the tactical grid.",
    focus: [], prep: 3, problems: 10, bogeys: 3, fuelSeconds: 300,
  },
  {
    id: "ch9-07", n: 7, unitId: "ch9", name: "PARALLEL TRACKS", kind: "patrol",
    brief: "Two parallel runways and one taxiway make eight angles and only two sizes.",
    focus: [], prep: 3, problems: 11, bogeys: 3, fuelSeconds: 320,
  },
  {
    id: "ch9-08", n: 8, unitId: "ch9", name: "MIXED GEOMETRY", kind: "patrol",
    brief: "Everything Chapter 9 has taught you, in any order, with honors work in the deck.",
    focus: [], prep: 3, problems: 12, bogeys: 3, fuelSeconds: 340,
  },
  {
    id: "ch9-09", n: 9, unitId: "ch9", name: "PRE-QUAL", kind: "intercept",
    brief: "Last check before the qualification. Transfer problems are in the deck.",
    focus: [], prep: 3, problems: 13, bogeys: 3, fuelSeconds: 340,
  },
  {
    id: "ch9-10", n: 10, unitId: "ch9", name: "RAPTOR QUALIFICATION", kind: "boss",
    brief: "Unit 9 boss sortie. Mixed review of Chapters 1 to 9. Passing earns the F-22A.",
    focus: [], prep: 3, problems: 16, bogeys: 3, fuelSeconds: 420,
  },
];

/**
 * Chapter 10, Surface Area and Volume. Six skills, six introducing sorties, and
 * the last unit of the year: its boss is a review of all ten chapters and it
 * earns the F-35A. The Blackbird stays locked until every chapter is ONLINE.
 */
export const CH10_MISSIONS: Mission[] = [
  {
    id: "ch10-01", n: 1, unitId: "ch10", name: "PAINT THE CRATE", kind: "intercept",
    brief: "Surface area is every face added up. Unfold it in your head and count them.",
    focus: ["g.10.1"], prep: 2, problems: 6, bogeys: 3, fuelSeconds: 240,
  },
  {
    id: "ch10-02", n: 2, unitId: "ch10", name: "DRUM LABEL", kind: "intercept",
    brief: "A cylinder unrolls into two circles and a rectangle. The rectangle is as wide as the circle is round.",
    focus: ["g.10.2"], prep: 2, problems: 7, bogeys: 3, fuelSeconds: 260,
  },
  {
    id: "ch10-03", n: 3, unitId: "ch10", name: "TENT HANGAR", kind: "intercept",
    brief: "A pyramid is a base and a ring of triangles. The triangles use the slant, not the height.",
    focus: ["g.10.3"], prep: 2, problems: 7, bogeys: 3, fuelSeconds: 260,
  },
  {
    id: "ch10-04", n: 4, unitId: "ch10", name: "TANK CAPACITY", kind: "intercept",
    brief: "Base area times length. The base is the face that repeats all the way along.",
    focus: ["g.10.4"], prep: 3, problems: 8, bogeys: 3, fuelSeconds: 280,
  },
  {
    id: "ch10-05", n: 5, unitId: "ch10", name: "NOSE CONE", kind: "intercept",
    brief: "A pyramid holds exactly a third of the box around it. Do not lose the third.",
    focus: ["g.10.5"], prep: 3, problems: 9, bogeys: 3, fuelSeconds: 300,
  },
  {
    id: "ch10-06", n: 6, unitId: "ch10", name: "SECTION CUT", kind: "intercept",
    brief: "Slice it and look at the cut face. Across gives you the base back; straight down usually does not.",
    focus: ["g.10.6"], prep: 3, problems: 10, bogeys: 3, fuelSeconds: 300,
  },
  {
    id: "ch10-07", n: 7, unitId: "ch10", name: "ROUND SOLIDS", kind: "patrol",
    brief: "Honors work: cylinders, cones and spheres, and the one third that separates two of them.",
    focus: [], prep: 3, problems: 11, bogeys: 3, fuelSeconds: 320,
  },
  {
    id: "ch10-08", n: 8, unitId: "ch10", name: "MIXED SOLIDS", kind: "patrol",
    brief: "Everything Chapter 10 has taught you, in any order, with honors work in the deck.",
    focus: [], prep: 3, problems: 12, bogeys: 3, fuelSeconds: 340,
  },
  {
    id: "ch10-09", n: 9, unitId: "ch10", name: "PRE-QUAL", kind: "intercept",
    brief: "Last check before the qualification. Transfer problems are in the deck.",
    focus: [], prep: 3, problems: 14, bogeys: 3, fuelSeconds: 360,
  },
  {
    id: "ch10-10", n: 10, unitId: "ch10", name: "BLACKBIRD QUALIFICATION", kind: "boss",
    brief: "Unit 10 boss sortie. Mixed review of the whole year, all ten chapters. Passing earns the F-35A.",
    focus: [], prep: 3, problems: 18, bogeys: 3, fuelSeconds: 460,
  },
];

export const MISSIONS: Mission[] = [
  ...CH1_MISSIONS, ...CH2_MISSIONS, ...CH3_MISSIONS, ...CH4_MISSIONS, ...CH5_MISSIONS, ...CH6_MISSIONS,
  ...CH7_MISSIONS, ...CH8_MISSIONS, ...CH9_MISSIONS, ...CH10_MISSIONS,
];

export function missionsFor(unitId: string): Mission[] {
  return MISSIONS.filter((m) => m.unitId === unitId).sort((a, b) => a.n - b.n);
}

export function mission(id: string): Mission {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m) throw new Error(`unknown mission ${id}`);
  return m;
}
