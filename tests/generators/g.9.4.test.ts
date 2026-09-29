import { describeGenerator } from "./harness";
import type { Answer } from "../../src/engine/types";
import { generate, VARIANTS } from "../../src/generators/g/g.9.4";

describeGenerator({
  skill: "g.9.4",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 10000, 2: 10000, 3: 9999, 4: 10000 },
  // registry T1: can these three lengths close into a triangle?
  tier1Form: (a: Answer) => a === "YES" || a === "NO",
});
