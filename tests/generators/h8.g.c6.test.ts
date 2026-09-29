import { describeGenerator, isDecimalTo } from "./harness";
import { generate, VARIANTS } from "../../src/generators/h8/h8.g.c6";

describeGenerator({
  skill: "h8.g.c6",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 600, 2: 1197, 3: 1747, 4: 1756 },
  // registry T1: a cylinder's volume, in terms of pi or with 3.14.
  tier1Form: isDecimalTo(2),
});
