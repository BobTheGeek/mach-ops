import { describeGenerator } from "./harness";
import type { Answer } from "../../src/engine/types";
import { generate, VARIANTS } from "../../src/generators/rp/rp.5.5";

describeGenerator({
  skill: "rp.5.5",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 420, 2: 560, 3: 558, 4: 560 },
  maxShare: 0.015,
  // registry T1: which graph is proportional; the lines are named A and B.
  tier1Form: (a: Answer) => typeof a === "string" && /^LINE [AB]$/.test(a),
});
