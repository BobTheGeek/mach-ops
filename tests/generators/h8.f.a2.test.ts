import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/h8/h8.f.a2";

describeGenerator({
  skill: "h8.f.a2",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 9716, 2: 9880, 3: 9790, 4: 9797 },
  // registry T1: the rate of change out of a table.
  tier1Form: isInteger,
});
