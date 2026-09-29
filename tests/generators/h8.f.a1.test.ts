import { describeGenerator } from "./harness";
import type { Answer } from "../../src/engine/types";
import { generate, VARIANTS } from "../../src/generators/h8/h8.f.a1";

describeGenerator({
  skill: "h8.f.a1",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 9871, 2: 9954, 3: 9947, 4: 4986 },
  maxShare: 0.08,
  // registry T1: function or not, from a mapping diagram.
  tier1Form: (a: Answer) => a === "YES" || a === "NO",
});
