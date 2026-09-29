import { describeGenerator } from "./harness";
import { generate, VARIANTS } from "../../src/generators/ee/ee.3.2";
import { parseLinear } from "../../src/engine/linear";
import type { Answer } from "../../src/engine/types";

describeGenerator({
  skill: "ee.3.2",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 9417, 2: 9423, 3: 9413, 4: 9452 },
  // registry T1: the sum of two linear expressions, written as one.
  tier1Form: (a: Answer) => typeof a === "string" && parseLinear(a) !== null,
});
