import { describeGenerator } from "./harness";
import type { Answer } from "../../src/engine/types";
import { isRational } from "../../src/engine/rational";
import { generate, VARIANTS } from "../../src/generators/h8/h8.g.a1d";

describeGenerator({
  skill: "h8.g.a1d",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 8915, 2: 9497, 3: 9505, 4: 9447 },
  // registry T1: the scale factor from two matching lengths; a shrink is a fraction.
  tier1Form: (a: Answer) => isRational(a),
});
