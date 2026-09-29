import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/rp/rp.5.1";

describeGenerator({
  skill: "rp.5.1",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 136, 2: 1970, 3: 4135, 4: 6464 },
  // registry T1: complete a ratio table with a whole-number multiplier.
  tier1Form: isInteger,
});
