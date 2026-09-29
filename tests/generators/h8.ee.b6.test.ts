import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/h8/h8.ee.b6";

describeGenerator({
  skill: "h8.ee.b6",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 2652, 2: 4557, 3: 4580, 4: 7311 },
  // registry T1: the slope between two lattice points.
  tier1Form: isInteger,
});
