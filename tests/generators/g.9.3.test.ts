import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/g/g.9.3";

describeGenerator({
  skill: "g.9.3",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 8100, 2: 8842, 3: 8839, 4: 8462 },
  // registry T1: an L-shape built from two rectangles.
  tier1Form: isInteger,
});
