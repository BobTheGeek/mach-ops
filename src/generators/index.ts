// Generator registry. Chapters 1-2; later chapters register here.

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
};

export const IMPLEMENTED_SKILLS = Object.keys(GENERATORS);

export function generatorFor(skill: string): Generator {
  const g = GENERATORS[skill];
  if (!g) throw new Error(`no generator for skill ${skill}`);
  return g;
}
