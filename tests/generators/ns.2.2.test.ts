import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/ns/ns.2.2";

describeGenerator({
  skill: "ns.2.2",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 255, 2: 380, 3: 3000, 4: 3000 },
  tier1Form: isInteger, // registry T1: exact quotients <= 12
});
