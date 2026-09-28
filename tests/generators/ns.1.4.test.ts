import { describeGenerator, describeFigureDiscretion, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/ns/ns.1.4";

describeGenerator({
  skill: "ns.1.4",
  generate,
  variants: VARIANTS,
  // T1 is a in [0,30] x b in [1,40] = 1,240 possible draws in total.
  minUnique: { 1: 1200, 2: 1900, 3: 2800, 4: 6600 },
  tier1Form: isInteger, // registry T1: positive minus positive, may go negative
});

describeFigureDiscretion({ skill: "ns.1.4", generate });
