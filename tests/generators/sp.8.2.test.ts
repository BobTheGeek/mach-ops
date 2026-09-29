import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/sp/sp.8.2";

describeGenerator({
  skill: "sp.8.2",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 10000, 2: 10000, 3: 10000, 4: 10000 },
  // registry T1: scale a sample proportion up to a whole count.
  tier1Form: isInteger,
});
