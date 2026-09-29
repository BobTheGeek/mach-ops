import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/h8/h8.ee.a2";

describeGenerator({
  skill: "h8.ee.a2",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 30, 2: 50, 3: 45, 4: 37 },
  maxShare: 0.06,
  // registry T1: the square root of a perfect square to 225.
  // Fifteen perfect squares asked two ways is thirty cards, and that is the
  // registry's own bound on the skill rather than a narrow generator.
  tier1Form: isInteger,
});
