import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/rp/rp.6.5";

describeGenerator({
  skill: "rp.6.5",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 1424, 2: 2743, 3: 2732, 4: 2760 },
  // registry T1: sale price from a percent off.
  tier1Form: isInteger,
});
