import { describeGenerator, isDecimalTo } from "./harness";
import { generate, VARIANTS } from "../../src/generators/g/g.9.2";

describeGenerator({
  skill: "g.9.2",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 160, 2: 480, 3: 359, 4: 359 },
  maxShare: 0.02,
  // registry T1: the area from the radius, in terms of pi or with 3.14.
  tier1Form: isDecimalTo(3),
});
