import { describeGenerator, describeFigureDiscretion, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/ns/ns.1.1";

describeGenerator({
  skill: "ns.1.1",
  generate,
  variants: VARIANTS,
  // T1 draws a,b in [-30,30] over 2 variants; T3/T4 draw sets and rationals.
  minUnique: { 1: 5000, 2: 9500, 3: 9900, 4: 9500 },
  tier1Form: isInteger, // registry T1: compare two integers; |n| for an integer
});

describeFigureDiscretion({ skill: "ns.1.1", generate });
