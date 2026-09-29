import { describeGenerator, isProbability } from "./harness";
import { generate, VARIANTS } from "../../src/generators/h8/h8.sp.b4a";

describeGenerator({
  skill: "h8.sp.b4a",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 2609, 2: 3701, 3: 3615, 4: 5992 },
  // registry T1: P of one named pair from two stages.
  tier1Form: isProbability,
});
