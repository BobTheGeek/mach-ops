import { describeGenerator, describeFigureDiscretion } from "./harness";
import { generate, VARIANTS } from "../../src/generators/ns/ns.2.3";
import { isRational, isTerminating, decimalPlaces } from "../../src/engine/rational";
import type { Answer } from "../../src/engine/types";

describeGenerator({
  skill: "ns.2.3",
  generate,
  variants: VARIANTS,
  // The registry fixes seven denominators; numerators run to 3x the denominator,
  // which is the whole tier-1 space at 129 values.
  minUnique: { 1: 125, 2: 195, 3: 1000, 4: 5700 },
  maxShare: 0.015,
  // registry T1: denominators 2, 4, 5, 8, 10, 20, 25 — every one terminates.
  tier1Form: (a: Answer) => isRational(a) && isTerminating(a) && decimalPlaces(a) <= 3,
});

describeFigureDiscretion({ skill: "ns.2.3", generate });
