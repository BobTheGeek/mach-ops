import { describeGenerator } from "./harness";
import type { Answer } from "../../src/engine/types";
import { LIKELIHOODS } from "../../src/generators/sp/sp.7.1";
import { generate, VARIANTS } from "../../src/generators/sp/sp.7.1";

describeGenerator({
  skill: "sp.7.1",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 4094, 2: 5066, 3: 4813, 4: 6713 },
  // registry T1: classify likelihood, impossible through certain.
  tier1Form: (a: Answer) => typeof a === "string" && (LIKELIHOODS as readonly string[]).includes(a),
});
