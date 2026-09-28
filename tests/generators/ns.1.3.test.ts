import { describeGenerator, isDecimalTo } from "./harness";
import { generate, VARIANTS } from "../../src/generators/ns/ns.1.3";

describeGenerator({
  skill: "ns.1.3",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 8700, 2: 7400, 3: 7300, 4: 9100 },
  // registry T1: two decimals at 1 place, so the sum is exact to 1 place.
  tier1Form: isDecimalTo(1),
});
