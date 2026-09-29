import { describeGenerator, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/g/g.10.5";

describeGenerator({
  skill: "g.10.5",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 304, 2: 2396, 3: 2425, 4: 608 },
  // registry T1: a square pyramid's volume, built to come out whole.
  tier1Form: isInteger,
});
