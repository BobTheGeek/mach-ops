import { describeGenerator, isDecimalTo } from "./harness";
import { generate, VARIANTS } from "../../src/generators/g/g.9.1";

describeGenerator({
  skill: "g.9.1",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 200, 2: 600, 3: 600, 4: 2024 },
  // registry T1: radius to diameter and back; the radius runs in halves.
  tier1Form: isDecimalTo(1),
});
