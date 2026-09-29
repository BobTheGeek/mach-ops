import { describeGenerator } from "./harness";
import { generate, VARIANTS } from "../../src/generators/ee/ee.3.3";
import { parseLinear } from "../../src/engine/linear";
import type { Answer } from "../../src/engine/types";

describeGenerator({
  skill: "ee.3.3",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 1026, 2: 2036, 3: 5569, 4: 5181 },
  // registry T1: a positive factor distributed over positive terms.
  tier1Form: (a: Answer) => typeof a === "string" && parseLinear(a) !== null,
});
