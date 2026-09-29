import { describeGenerator } from "./harness";
import { generate, VARIANTS } from "../../src/generators/h8/h8.ns.a2";
import { isRational, isInteger } from "../../src/engine/rational";
import type { Answer } from "../../src/engine/types";

describeGenerator({
  skill: "h8.ns.a2",
  generate,
  variants: VARIANTS,
  // Tier 1 is the 138 non-square radicands in [2, 150].
  minUnique: { 1: 130, 2: 260, 3: 4800, 4: 7700 },
  // registry T1: which two whole numbers is the root between — a whole number.
  tier1Form: (a: Answer) => isRational(a) && isInteger(a),
});
