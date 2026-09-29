import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/ee/ee.4.2";

describeGenerator({
  skill: "ee.4.2",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 323, 2: 647, 3: 1177, 4: 1556 },
  // registry T1: ax = b chosen so the quotient is exact.
  tier1Form: isInteger,
});
