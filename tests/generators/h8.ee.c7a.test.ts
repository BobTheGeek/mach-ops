import { describeGenerator } from "./harness";
import { generate, VARIANTS } from "../../src/generators/h8/h8.ee.c7a";
import type { Answer } from "../../src/engine/types";

const LABELS = ["ONE SOLUTION", "NO SOLUTION", "INFINITELY MANY"];

describeGenerator({
  skill: "h8.ee.c7a",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 3900, 2: 5600, 3: 7900, 4: 7200 },
  // registry T1: classify after simplifying — one of the three cases.
  tier1Form: (a: Answer) => typeof a === "string" && LABELS.includes(a),
});
