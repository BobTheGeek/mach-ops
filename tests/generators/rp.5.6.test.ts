import { describeGenerator, isDecimalTo } from "./harness";
import { generate, VARIANTS } from "../../src/generators/rp/rp.5.6";

describeGenerator({
  skill: "rp.5.6",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 1471, 2: 2611, 3: 1411, 4: 159 },
  maxShare: 0.015,
  // registry T1: drawing length -> actual length with a scale like 1 cm : 25 km.
  tier1Form: isDecimalTo(1),
});
