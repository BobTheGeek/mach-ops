import { describeGenerator } from "./harness";
import type { Answer } from "../../src/engine/types";
import { generate, VARIANTS } from "../../src/generators/g/g.10.6";

const SHAPES = ["RECTANGLE", "TRIANGLE", "CIRCLE", "SQUARE"];

describeGenerator({
  skill: "g.10.6",
  generate,
  variants: VARIANTS,
  minUnique: { 1: 4, 2: 8, 3: 10, 4: 20 },
  maxShare: 0.30,
  // registry T1: the face of a prism sliced parallel to its base.
  // This skill is a fact set, not a range: the registry lists the solids and
  // the slice directions, and four prisms times one direction IS four cards.
  // The floor is the whole space rather than a sample of it.
  tier1Form: (a: Answer) => typeof a === "string" && SHAPES.includes(a),
});
