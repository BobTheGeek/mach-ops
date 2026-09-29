import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/sp/sp.7.4";

describeGenerator({
  skill: "sp.7.4",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 10000, 2: 10000, 3: 9995, 4: 9986 },
  // registry T1: the range of a set of whole values.
  tier1Form: isInteger,
});
