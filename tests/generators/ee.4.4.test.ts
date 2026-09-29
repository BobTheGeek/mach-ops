import { describeGenerator } from "./harness";
import { generate, VARIANTS } from "../../src/generators/ee/ee.4.4";
import { parseInequality } from "../../src/engine/inequality";
import type { Answer } from "../../src/engine/types";

describeGenerator({
  skill: "ee.4.4",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 235, 2: 471, 3: 471, 4: 471 },
  // registry T1: a phrase matched to an inequality.
  tier1Form: (a: Answer) => typeof a === "string" && parseInequality(a) !== null,
});
