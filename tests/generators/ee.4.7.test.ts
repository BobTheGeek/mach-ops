import { describeGenerator } from "./harness";
import { generate, VARIANTS } from "../../src/generators/ee/ee.4.7";
import { parseInequality } from "../../src/engine/inequality";
import type { Answer } from "../../src/engine/types";

describeGenerator({
  skill: "ee.4.7",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 9179, 2: 9370, 3: 9321, 4: 9402 },
  // registry T1: px + q < r, all positive.
  tier1Form: (a: Answer) => typeof a === "string" && parseInequality(a) !== null,
});
