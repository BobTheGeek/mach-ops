import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/g/g.10.4";

describeGenerator({
  skill: "g.10.4",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 10000, 2: 10000, 3: 10000, 4: 10000 },
  // registry T1: V = Bh on a rectangular prism.
  tier1Form: isInteger,
});
