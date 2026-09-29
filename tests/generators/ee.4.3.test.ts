import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/ee/ee.4.3";

describeGenerator({
  skill: "ee.4.3",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 9179, 2: 9389, 3: 9179, 4: 9173 },
  // registry T1: px + q = r with positive integers, x chosen first.
  tier1Form: isInteger,
});
