import { describeGenerator } from "./harness";
import { generate, VARIANTS } from "../../src/generators/ee/ee.4.5";
import { parseInequality } from "../../src/engine/inequality";
import type { Answer } from "../../src/engine/types";

describeGenerator({
  skill: "ee.4.5",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 3194, 2: 6588, 3: 8673, 4: 9441 },
  // registry T1: x + a < b with positive integers.
  tier1Form: (a: Answer) => typeof a === "string" && parseInequality(a) !== null,
});
