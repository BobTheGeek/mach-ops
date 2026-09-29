import { describeGenerator } from "./harness";
import type { Answer } from "../../src/engine/types";
import { generate, VARIANTS } from "../../src/generators/h8/h8.g.a2";

const PAIRS = ["CORRESPONDING", "ALTERNATE INTERIOR", "ALTERNATE EXTERIOR", "SAME-SIDE INTERIOR"];

describeGenerator({
  skill: "h8.g.a2",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 484, 2: 968, 3: 5128, 4: 5155 },
  // registry T1: name the pair of angles.
  tier1Form: (a: Answer) => typeof a === "string" && PAIRS.includes(a),
});
