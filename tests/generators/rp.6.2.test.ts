import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/rp/rp.6.2";

describeGenerator({
  skill: "rp.6.2",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 308, 2: 617, 3: 617, 4: 617 },
  // registry T1: find the part, 25% of 80.
  tier1Form: isInteger,
});
