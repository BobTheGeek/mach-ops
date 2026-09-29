import { describeGenerator } from "./harness";
import { generate, VARIANTS } from "../../src/generators/ee/ee.3.4";
import { parseFactored } from "../../src/engine/linear";
import type { Answer } from "../../src/engine/types";

describeGenerator({
  skill: "ee.3.4",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 928, 2: 1808, 3: 2485, 4: 2103 },
  // registry T1: a GCF pulled out of two positive terms, written g(ax + b).
  tier1Form: (a: Answer) => typeof a === "string" && parseFactored(a) !== null,
});
