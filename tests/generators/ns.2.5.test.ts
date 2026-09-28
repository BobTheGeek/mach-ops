import { describeGenerator, isDecimalTo } from "./harness";
import { generate, VARIANTS } from "../../src/generators/ns/ns.2.5";

describeGenerator({
  skill: "ns.2.5",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 4500, 2: 5500, 3: 6100, 4: 3800 },
  maxShare: 0.015,
  // registry T1: the quotient is chosen first as a 1-place decimal.
  tier1Form: isDecimalTo(1),
});
