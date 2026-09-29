import { describeGenerator, isDecimalTo } from "./harness";
import { generate, VARIANTS } from "../../src/generators/rp/rp.6.3";

describeGenerator({
  skill: "rp.6.3",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 3609, 2: 5551, 3: 5565, 4: 5543 },
  // registry T1: a = p% x w with clean numbers; prices run to cents.
  tier1Form: isDecimalTo(2),
});
