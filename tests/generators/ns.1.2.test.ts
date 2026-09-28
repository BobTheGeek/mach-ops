import { describeGenerator, describeFigureDiscretion, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/ns/ns.1.2";

describeGenerator({
  skill: "ns.1.2",
  generate,
  variants: VARIANTS,
  // T1 is 2 signs x 20 x 20 = 800 possible draws, and the generator reaches all of them.
  minUnique: { 1: 800, 2: 3700, 3: 5800, 4: 7600 },
  tier1Form: isInteger, // registry T1: two integers, same sign, |n| <= 20
});

describeFigureDiscretion({ skill: "ns.1.2", generate });
