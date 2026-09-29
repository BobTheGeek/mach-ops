import { describeGenerator } from "./harness";
import type { Answer } from "../../src/engine/types";
import { generate, VARIANTS } from "../../src/generators/rp/rp.5.3";

describeGenerator({
  skill: "rp.5.3",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 4370, 2: 3224, 3: 3025, 4: 4943 },
  // registry T1: is this table proportional? (yes/no)
  tier1Form: (a: Answer) => a === "PROPORTIONAL" || a === "NOT PROPORTIONAL",
});
