import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/rp/rp.6.4";

describeGenerator({
  skill: "rp.6.4",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 2068, 2: 3744, 3: 3711, 4: 3723 },
  // registry T1: percent increase with clean numbers.
  tier1Form: isInteger,
});
