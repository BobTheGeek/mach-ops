import { describeGenerator } from "./harness";
import type { Answer } from "../../src/engine/types";
import { generate, VARIANTS } from "../../src/generators/h8/h8.g.b3";

describeGenerator({
  skill: "h8.g.b3",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 240, 2: 480, 3: 480, 4: 480 },
  maxShare: 0.04,
  // registry T1: name the hypotenuse.
  tier1Form: (a: Answer) => typeof a === "string" && a.startsWith("THE "),
});
