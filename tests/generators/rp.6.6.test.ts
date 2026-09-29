import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/rp/rp.6.6";

describeGenerator({
  skill: "rp.6.6",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 4579, 2: 6484, 3: 5835, 4: 5778 },
  // registry T1: I from P, r, t in whole years.
  tier1Form: isInteger,
});
