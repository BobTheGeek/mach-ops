import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/rp/rp.5.2";

describeGenerator({
  skill: "rp.5.2",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 616, 2: 4314, 3: 3804, 4: 410 },
  // registry T1: whole-number rate, 240 L in 8 min -> per minute.
  tier1Form: isInteger,
});
