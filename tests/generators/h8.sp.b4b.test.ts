import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/h8/h8.sp.b4b";

describeGenerator({
  skill: "h8.sp.b4b",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 1237, 2: 2310, 3: 1228, 4: 4052 },
  maxShare: 0.035,
  // registry T1: how many outcomes the combined sample space holds.
  tier1Form: isInteger,
});
