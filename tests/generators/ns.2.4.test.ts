import { describeGenerator, isDecimalTo } from "./harness";
import { generate, VARIANTS } from "../../src/generators/ns/ns.2.4";

describeGenerator({
  skill: "ns.2.4",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 5400, 2: 5800, 3: 5900, 4: 7800 },
  // registry T1: a 1-place decimal times an integer, so the product has 1 place.
  tier1Form: isDecimalTo(1),
});
