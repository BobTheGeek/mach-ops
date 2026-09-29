import { describeGenerator } from "./harness";
import type { Answer } from "../../src/engine/types";
import { generate, VARIANTS } from "../../src/generators/sp/sp.8.3";

describeGenerator({
  skill: "sp.8.3",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 9988, 2: 9989, 3: 9990, 4: 9990 },
  // registry T1: name the group with the higher centre.
  tier1Form: (a: Answer) => typeof a === "string" && a === a.toUpperCase(),
});
