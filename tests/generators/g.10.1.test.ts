import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/g/g.10.1";

describeGenerator({
  skill: "g.10.1",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 5264, 2: 3671, 3: 3676, 4: 7691 },
  maxShare: 0.02,
  // registry T1: the surface area of a rectangular prism.
  tier1Form: isInteger,
});
