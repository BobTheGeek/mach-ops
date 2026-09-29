import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/sp/sp.8.4";

describeGenerator({
  skill: "sp.8.4",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 10000, 2: 10000, 3: 10000, 4: 10000 },
  // registry T1: how far apart two sample medians are.
  tier1Form: isInteger,
});
