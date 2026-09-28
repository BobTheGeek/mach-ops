import { describeGenerator, describeFigureDiscretion, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/ns/ns.2.1";

describeGenerator({
  skill: "ns.2.1",
  generate,
  variants: VARIANTS,
  // T1 is 11 x 11 factor pairs in two orders = 242 draws in total.
  minUnique: { 1: 235, 2: 420, 3: 2900, 4: 2600 },
  // Tier 4 mixes (-a)^2, which has only 22 possibilities, with two large variants.
  maxShare: 0.02,
  tier1Form: isInteger, // registry T1: one negative factor, products <= 100
});

describeFigureDiscretion({ skill: "ns.2.1", generate });
