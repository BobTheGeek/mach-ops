import { describeGenerator } from "./harness";
import type { Answer } from "../../src/engine/types";
import { generate, VARIANTS } from "../../src/generators/h8/h8.sp.a1";

describeGenerator({
  skill: "h8.sp.a1",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 10000, 2: 10000, 3: 10000, 4: 10000 },
  // registry T1: name the association shown by a scatter plot.
  tier1Form: (a: Answer) => a === "POSITIVE" || a === "NEGATIVE" || a === "NONE",
});
