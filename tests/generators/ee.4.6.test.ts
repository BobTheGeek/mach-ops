import { describeGenerator } from "./harness";
import { generate, VARIANTS } from "../../src/generators/ee/ee.4.6";
import { parseInequality } from "../../src/engine/inequality";
import type { Answer } from "../../src/engine/types";

describeGenerator({
  skill: "ee.4.6",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 1710, 2: 3210, 3: 5404, 4: 4535 },
  // registry T1: ax > b with a positive, so no flip.
  tier1Form: (a: Answer) => typeof a === "string" && parseInequality(a) !== null,
});
