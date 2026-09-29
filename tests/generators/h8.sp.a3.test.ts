import { describeGenerator, isDecimalTo } from "./harness";
import { generate, VARIANTS } from "../../src/generators/h8/h8.sp.a3";

describeGenerator({
  skill: "h8.sp.a3",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 3990, 2: 5787, 3: 5797, 4: 5782 },
  // registry T1: predict y from x with the model; m may be a half.
  tier1Form: isDecimalTo(1),
});
