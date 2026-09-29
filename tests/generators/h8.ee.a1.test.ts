import { describeGenerator } from "./harness";
import { generate, VARIANTS } from "../../src/generators/h8/h8.ee.a1";
import type { Answer } from "../../src/engine/types";

describeGenerator({
  skill: "h8.ee.a1",
  generate,
  variants: VARIANTS,
  // Bases 2-10 plus x, exponents in small ranges: the space is genuinely small,
  // and tier 3 mixes two variants over the same bases.
  minUnique: { 1: 340, 2: 670, 3: 290, 4: 415 },
  maxShare: 0.05,
  // registry T1: the product rule with positive exponents, written as one power.
  tier1Form: (a: Answer) => typeof a === "string" && /^[0-9x]/.test(a),
});
