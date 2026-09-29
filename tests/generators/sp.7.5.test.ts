import { describeGenerator } from "./harness";
import type { Answer } from "../../src/engine/types";
import { generate, VARIANTS } from "../../src/generators/sp/sp.7.5";

describeGenerator({
  skill: "sp.7.5",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 6988, 2: 6306, 3: 4703, 4: 7034 },
  // registry T1: symmetric or skewed, read off a dot plot.
  tier1Form: (a: Answer) => typeof a === "string" && /^(SYMMETRIC|SKEWED (LEFT|RIGHT))$/.test(a),
});
