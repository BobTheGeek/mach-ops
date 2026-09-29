import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/rp/rp.5.4";

describeGenerator({
  skill: "rp.5.4",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 418, 2: 4056, 3: 7961, 4: 8039 },
  // registry T1: a/b = x/d with a clean scale factor.
  tier1Form: isInteger,
});
