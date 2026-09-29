import { describeGenerator } from "./harness";
import type { Answer } from "../../src/engine/types";
import { generate, VARIANTS } from "../../src/generators/h8/h8.sp.a2";

describeGenerator({
  skill: "h8.sp.a2",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 9999, 2: 10000, 3: 9998, 4: 10000 },
  // registry T1: the best of three candidate lines.
  tier1Form: (a: Answer) => typeof a === "string" && a.startsWith("y = "),
});
