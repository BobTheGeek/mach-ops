import { describeGenerator } from "./harness";
import type { Answer } from "../../src/engine/types";
import { generate, VARIANTS } from "../../src/generators/h8/h8.ee.c8a";

describeGenerator({
  skill: "h8.ee.c8a",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 1539, 2: 2758, 3: 2777, 4: 2763 },
  // registry T1: one, none or infinitely many, read off a graph.
  tier1Form: (a: Answer) => typeof a === "string" && /SOLUTION/.test(a),
});
