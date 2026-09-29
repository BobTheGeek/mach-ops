import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/ee/ee.4.1";

describeGenerator({
  skill: "ee.4.1",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 4857, 2: 6667, 3: 7970, 4: 9381 },
  // registry T1: x + a = b with integers.
  tier1Form: isInteger,
});
