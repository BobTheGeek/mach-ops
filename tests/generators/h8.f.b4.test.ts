import { describeGenerator } from "./harness";
import type { Answer } from "../../src/engine/types";
import { parseLinear } from "../../src/engine/linear";
import { generate, VARIANTS } from "../../src/generators/h8/h8.f.b4";

describeGenerator({
  skill: "h8.f.b4",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 9006, 2: 9519, 3: 9528, 4: 9741 },
  // registry T1: the rule itself, written from a rate and a start.
  tier1Form: (a: Answer) => typeof a === "string" && parseLinear(a) !== null,
});
