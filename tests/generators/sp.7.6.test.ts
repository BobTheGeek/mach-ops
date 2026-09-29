import { describeGenerator, isDecimalTo } from "./harness";
import { generate, VARIANTS } from "../../src/generators/sp/sp.7.6";

describeGenerator({
  skill: "sp.7.6",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 10000, 2: 10000, 3: 10000, 4: 9358 },
  // registry T1: read one of the five numbers off a box plot; a quartile may land on a half.
  tier1Form: isDecimalTo(1),
});
