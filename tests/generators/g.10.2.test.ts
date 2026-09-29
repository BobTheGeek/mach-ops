import { describeGenerator, isDecimalTo } from "./harness";
import { generate, VARIANTS } from "../../src/generators/g/g.10.2";

describeGenerator({
  skill: "g.10.2",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 900, 2: 1794, 3: 1792, 4: 1792 },
  // registry T1: a cylinder's surface from r and h, in terms of pi or with 3.14.
  tier1Form: isDecimalTo(2),
});
