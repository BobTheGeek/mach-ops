import { describeGenerator } from "./harness";
import { generate, VARIANTS } from "../../src/generators/h8/h8.ns.a1";
import type { Answer } from "../../src/engine/types";

describeGenerator({
  skill: "h8.ns.a1",
  generate,
  variants: VARIANTS,
  // Tier 1 asks "is this rational?" about a generated foil list, so its space is
  // that list. Tiers 2-4 are the repeating decimals, widened by a whole part and
  // an optional non-repeating digit.
  minUnique: { 1: 250, 2: 1050, 3: 3700, 4: 7600 },
  maxShare: 0.02,
  // Tier 1 answers are the words RATIONAL or IRRATIONAL.
  tier1Form: (a: Answer) => a === "RATIONAL" || a === "IRRATIONAL",
});
