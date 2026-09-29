import { describeGenerator, isDecimalTo } from "./harness";
import { generate, VARIANTS } from "../../src/generators/rp/rp.6.1";

describeGenerator({
  skill: "rp.6.1",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 94, 2: 134, 3: 139, 4: 4847 },
  maxShare: 0.035,
  // registry T1: whole-number percents to decimals and fractions.
  tier1Form: isDecimalTo(2),
});
