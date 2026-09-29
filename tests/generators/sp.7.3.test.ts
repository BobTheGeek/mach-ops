import { describeGenerator } from "./harness";
import type { Answer } from "../../src/engine/types";
import { isRational } from "../../src/engine/rational";
import { generate, VARIANTS } from "../../src/generators/sp/sp.7.3";

describeGenerator({
  skill: "sp.7.3",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 9999, 2: 10000, 3: 10000, 4: 9999 },
  // registry T1: mean, median or mode of 5-7 whole numbers; a mean need not be whole.
  tier1Form: (a: Answer) => isRational(a),
});
