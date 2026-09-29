import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/h8/h8.g.b4";

describeGenerator({
  skill: "h8.g.b4",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 64, 2: 128, 3: 425, 4: 489 },
  maxShare: 0.05,
  // registry T1: the hypotenuse of a Pythagorean triple.
  // Ten triples at eight scales is the registry's list, so tier 1 is a fact set
  // the same way the roots are.
  tier1Form: isInteger,
});
