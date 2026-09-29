import { describeGenerator } from "./harness";
import type { Answer } from "../../src/engine/types";
import { generate, VARIANTS } from "../../src/generators/h8/h8.f.b5";

describeGenerator({
  skill: "h8.f.b5",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 7774, 2: 8802, 3: 8829, 4: 8808 },
  // registry T1: the shape of the graph that tells the story.
  tier1Form: (a: Answer) => typeof a === "string" && a.includes("→"),
});
