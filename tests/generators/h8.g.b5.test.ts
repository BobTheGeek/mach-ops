import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/h8/h8.g.b5";

describeGenerator({
  skill: "h8.g.b5",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 1719, 2: 2558, 3: 4594, 4: 4643 },
  // registry T1: a horizontal or vertical gap on the grid.
  tier1Form: isInteger,
});
