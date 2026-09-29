import { describeGenerator } from "./harness";
import type { Answer } from "../../src/engine/types";
import { isRational } from "../../src/engine/rational";
import { generate, VARIANTS } from "../../src/generators/h8/h8.ee.c8b";

describeGenerator({
  skill: "h8.ee.c8b",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 2615, 2: 4386, 3: 4412, 4: 4428 },
  // registry T1: the crossing point, put on the grid. The answer is a PAIR, and
  // the harness checks each coordinate of it in turn — both are lattice points,
  // because a crossing at (2.37, −1.04) is not something you can put a dot on.
  tier1Form: (a: Answer) => isRational(a) && a.d === 1,
});
