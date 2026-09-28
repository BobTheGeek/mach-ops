import { describeGenerator, isDecimalTo } from "./harness";
import { generate, VARIANTS } from "../../src/generators/ns/ns.1.5";

describeGenerator({
  skill: "ns.1.5",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 9400, 2: 7600, 3: 7200, 4: 9000 },
  // registry T1: decimals at 1-2 places, so the difference is exact to 2 places.
  tier1Form: isDecimalTo(2),
});
