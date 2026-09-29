import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/g/g.9.5";

describeGenerator({
  skill: "g.9.5",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 9999, 2: 9999, 3: 10000, 4: 10000 },
  // registry T1: the complement or supplement of a whole number of degrees.
  tier1Form: isInteger,
});
