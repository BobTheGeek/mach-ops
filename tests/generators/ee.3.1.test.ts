import { describeGenerator, describeFigureDiscretion, isInteger } from "./harness";
import { generate, VARIANTS } from "../../src/generators/ee/ee.3.1";

describeGenerator({
  skill: "ee.3.1",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 5475, 2: 8304, 3: 9489, 4: 7859 },
  // registry T1: evaluate ax + b for an integer x, so the answer is an integer.
  tier1Form: isInteger,
});

describeFigureDiscretion({ skill: "ee.3.1", generate });
