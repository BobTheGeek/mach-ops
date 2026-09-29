import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/g/g.10.3";

describeGenerator({
  skill: "g.10.3",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 437, 2: 3313, 3: 3302, 4: 3295 },
  // registry T1: a square pyramid's surface from its net.
  tier1Form: isInteger,
});
