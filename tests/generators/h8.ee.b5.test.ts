import { describeGenerator, isDecimalTo } from "./harness";
import { generate, VARIANTS } from "../../src/generators/h8/h8.ee.b5";

describeGenerator({
  skill: "h8.ee.b5",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 990, 2: 1970, 3: 1970, 4: 1962 },
  // registry T1: the slope of a line through the origin, in halves.
  tier1Form: isDecimalTo(1),
});
