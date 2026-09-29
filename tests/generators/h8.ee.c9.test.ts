import { describeGenerator } from "./harness";
import type { Answer } from "../../src/engine/types";
import { generate, VARIANTS } from "../../src/generators/h8/h8.ee.c9";

describeGenerator({
  skill: "h8.ee.c9",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 5270, 2: 3957, 3: 728, 4: 5063 },
  // registry T1: the one-variable inequality on a number line, described in words.
  tier1Form: (a: Answer) => typeof a === "string" && a.length > 4,
});
