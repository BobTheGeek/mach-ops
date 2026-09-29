// Generator registry. Chapters 1-2 plus the Q1 honors skills; later chapters
// register here.

import type { Generator } from "../engine/types";
import { generate as ns11 } from "./ns/ns.1.1";
import { generate as ns12 } from "./ns/ns.1.2";
import { generate as ns13 } from "./ns/ns.1.3";
import { generate as ns14 } from "./ns/ns.1.4";
import { generate as ns15 } from "./ns/ns.1.5";
import { generate as ns21 } from "./ns/ns.2.1";
import { generate as ns22 } from "./ns/ns.2.2";
import { generate as ns23 } from "./ns/ns.2.3";
import { generate as ns24 } from "./ns/ns.2.4";
import { generate as ns25 } from "./ns/ns.2.5";
import { generate as h8nsa1 } from "./h8/h8.ns.a1";
import { generate as h8nsa2 } from "./h8/h8.ns.a2";
import { generate as h8eea1 } from "./h8/h8.ee.a1";
import { generate as h8eea3 } from "./h8/h8.ee.a3";
import { generate as h8eea4 } from "./h8/h8.ee.a4";
import { generate as h8eec7a } from "./h8/h8.ee.c7a";
import { generate as h8eec7b } from "./h8/h8.ee.c7b";

export const GENERATORS: Record<string, Generator> = {
  "ns.1.1": ns11,
  "ns.1.2": ns12,
  "ns.1.3": ns13,
  "ns.1.4": ns14,
  "ns.1.5": ns15,
  "ns.2.1": ns21,
  "ns.2.2": ns22,
  "ns.2.3": ns23,
  "ns.2.4": ns24,
  "ns.2.5": ns25,
  "h8.ns.a1": h8nsa1,
  "h8.ns.a2": h8nsa2,
  "h8.ee.a1": h8eea1,
  "h8.ee.a3": h8eea3,
  "h8.ee.a4": h8eea4,
  "h8.ee.c7a": h8eec7a,
  "h8.ee.c7b": h8eec7b,
};

export const IMPLEMENTED_SKILLS = Object.keys(GENERATORS);

export function generatorFor(skill: string): Generator {
  const g = GENERATORS[skill];
  if (!g) throw new Error(`no generator for skill ${skill}`);
  return g;
}
