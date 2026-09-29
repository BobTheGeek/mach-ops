import { describeGenerator } from "./harness";
import { generate, VARIANTS } from "../../src/generators/h8/h8.ee.a3";
import type { Answer } from "../../src/engine/types";

describeGenerator({
  skill: "h8.ee.a3",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 5700, 2: 7100, 3: 5400, 4: 6600 },
  // registry T1: one digit times a power of ten, e.g. "4 × 10⁶".
  tier1Form: (a: Answer) => typeof a === "string" && /^\d × 10/.test(a),
});
