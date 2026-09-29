import { describeGenerator } from "./harness";
import type { Answer } from "../../src/engine/types";
import { generate, VARIANTS } from "../../src/generators/sp/sp.8.1";

describeGenerator({
  skill: "sp.8.1",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 8583, 2: 9412, 3: 9361, 4: 9259 },
  // registry T1: name the population or the sample in words.
  tier1Form: (a: Answer) => typeof a === "string" && a.length > 8,
});
