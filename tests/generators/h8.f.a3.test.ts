import { describeGenerator } from "./harness";
import type { Answer } from "../../src/engine/types";
import { generate, VARIANTS } from "../../src/generators/h8/h8.f.a3";

describeGenerator({
  skill: "h8.f.a3",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 5133, 2: 3510, 3: 3566, 4: 6952 },
  maxShare: 0.08,
  // registry T1: linear or not, from a table of constant differences.
  tier1Form: (a: Answer) => a === "YES" || a === "NO",
});
