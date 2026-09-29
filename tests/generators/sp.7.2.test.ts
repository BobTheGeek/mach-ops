import { describeGenerator, isProbability } from "./harness";
import { generate, VARIANTS } from "../../src/generators/sp/sp.7.2";

describeGenerator({
  skill: "sp.7.2",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 2690, 2: 5128, 3: 5579, 4: 5141 },
  // registry T1: experimental P read off a frequency table.
  tier1Form: isProbability,
});
