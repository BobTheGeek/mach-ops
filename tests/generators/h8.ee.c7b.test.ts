import { describeGenerator } from "./harness";
import { generate, VARIANTS } from "../../src/generators/h8/h8.ee.c7b";
import { isRational, isInteger } from "../../src/engine/rational";
import type { Answer } from "../../src/engine/types";

describeGenerator({
  skill: "h8.ee.c7b",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 7300, 2: 8600, 3: 8900, 4: 5800 },
  // registry T1: ax + b = cx + d with integers, so x is an integer.
  tier1Form: (a: Answer) => isRational(a) && isInteger(a),
});
