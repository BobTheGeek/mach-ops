import { describeGenerator } from "./harness";
import { generate, VARIANTS } from "../../src/generators/h8/h8.ee.a4";
import type { Answer } from "../../src/engine/types";

describeGenerator({
  skill: "h8.ee.a4",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 9500, 2: 9500, 3: 9500, 4: 8700 },
  // registry T1: scientific notation with the coefficient in [1, 10).
  tier1Form: (a: Answer) => {
    if (typeof a !== "string") return false;
    const m = /^(−?\d+(?:\.\d+)?) × 10/.exec(a);
    if (!m) return false;
    const c = Math.abs(Number(m[1]!.replace("−", "-")));
    return c >= 1 && c < 10;
  },
});
