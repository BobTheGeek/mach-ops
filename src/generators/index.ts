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
import { generate as ee31 } from "./ee/ee.3.1";
import { generate as ee32 } from "./ee/ee.3.2";
import { generate as ee33 } from "./ee/ee.3.3";
import { generate as ee34 } from "./ee/ee.3.4";
import { generate as ee41 } from "./ee/ee.4.1";
import { generate as ee42 } from "./ee/ee.4.2";
import { generate as ee43 } from "./ee/ee.4.3";
import { generate as ee44 } from "./ee/ee.4.4";
import { generate as ee45 } from "./ee/ee.4.5";
import { generate as ee46 } from "./ee/ee.4.6";
import { generate as ee47 } from "./ee/ee.4.7";
import { generate as rp51 } from "./rp/rp.5.1";
import { generate as rp52 } from "./rp/rp.5.2";
import { generate as rp53 } from "./rp/rp.5.3";
import { generate as rp54 } from "./rp/rp.5.4";
import { generate as rp55 } from "./rp/rp.5.5";
import { generate as rp56 } from "./rp/rp.5.6";
import { generate as rp61 } from "./rp/rp.6.1";
import { generate as rp62 } from "./rp/rp.6.2";
import { generate as rp63 } from "./rp/rp.6.3";
import { generate as rp64 } from "./rp/rp.6.4";
import { generate as rp65 } from "./rp/rp.6.5";
import { generate as rp66 } from "./rp/rp.6.6";
import { generate as sp71 } from "./sp/sp.7.1";
import { generate as sp72 } from "./sp/sp.7.2";
import { generate as sp73 } from "./sp/sp.7.3";
import { generate as sp74 } from "./sp/sp.7.4";
import { generate as sp75 } from "./sp/sp.7.5";
import { generate as sp76 } from "./sp/sp.7.6";
import { generate as sp81 } from "./sp/sp.8.1";
import { generate as sp82 } from "./sp/sp.8.2";
import { generate as sp83 } from "./sp/sp.8.3";
import { generate as sp84 } from "./sp/sp.8.4";
import { generate as h8spb4a } from "./h8/h8.sp.b4a";
import { generate as h8spb4b } from "./h8/h8.sp.b4b";
import { generate as h8spa1 } from "./h8/h8.sp.a1";
import { generate as h8spa3 } from "./h8/h8.sp.a3";
import { generate as g91 } from "./g/g.9.1";
import { generate as g92 } from "./g/g.9.2";
import { generate as g93 } from "./g/g.9.3";
import { generate as g94 } from "./g/g.9.4";
import { generate as g95 } from "./g/g.9.5";
import { generate as g101 } from "./g/g.10.1";
import { generate as g102 } from "./g/g.10.2";
import { generate as g103 } from "./g/g.10.3";
import { generate as g104 } from "./g/g.10.4";
import { generate as g105 } from "./g/g.10.5";
import { generate as g106 } from "./g/g.10.6";
import { generate as h8eea2 } from "./h8/h8.ee.a2";
import { generate as h8ga2 } from "./h8/h8.g.a2";
import { generate as h8gb3 } from "./h8/h8.g.b3";
import { generate as h8gb4 } from "./h8/h8.g.b4";
import { generate as h8gb5 } from "./h8/h8.g.b5";
import { generate as h8gc6 } from "./h8/h8.g.c6";
import { generate as h8eec8b } from "./h8/h8.ee.c8b";
import { generate as h8ga1d } from "./h8/h8.g.a1d";
import { generate as h8eeb5 } from "./h8/h8.ee.b5";
import { generate as h8eeb6 } from "./h8/h8.ee.b6";
import { generate as h8eec8a } from "./h8/h8.ee.c8a";
import { generate as h8eec9 } from "./h8/h8.ee.c9";
import { generate as h8fa1 } from "./h8/h8.f.a1";
import { generate as h8fa2 } from "./h8/h8.f.a2";
import { generate as h8fa3 } from "./h8/h8.f.a3";
import { generate as h8fb4 } from "./h8/h8.f.b4";
import { generate as h8fb5 } from "./h8/h8.f.b5";
import { generate as h8spa2 } from "./h8/h8.sp.a2";

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
  "ee.3.1": ee31,
  "ee.3.2": ee32,
  "ee.3.3": ee33,
  "ee.3.4": ee34,
  "ee.4.1": ee41,
  "ee.4.2": ee42,
  "ee.4.3": ee43,
  "ee.4.4": ee44,
  "ee.4.5": ee45,
  "ee.4.6": ee46,
  "ee.4.7": ee47,
  "rp.5.1": rp51,
  "rp.5.2": rp52,
  "rp.5.3": rp53,
  "rp.5.4": rp54,
  "rp.5.5": rp55,
  "rp.5.6": rp56,
  "rp.6.1": rp61,
  "rp.6.2": rp62,
  "rp.6.3": rp63,
  "rp.6.4": rp64,
  "rp.6.5": rp65,
  "rp.6.6": rp66,
  "sp.7.1": sp71,
  "sp.7.2": sp72,
  "sp.7.3": sp73,
  "sp.7.4": sp74,
  "sp.7.5": sp75,
  "sp.7.6": sp76,
  "sp.8.1": sp81,
  "sp.8.2": sp82,
  "sp.8.3": sp83,
  "sp.8.4": sp84,
  "h8.sp.b4a": h8spb4a,
  "h8.sp.b4b": h8spb4b,
  "h8.sp.a1": h8spa1,
  "h8.sp.a3": h8spa3,
  "g.9.1": g91,
  "g.9.2": g92,
  "g.9.3": g93,
  "g.9.4": g94,
  "g.9.5": g95,
  "g.10.1": g101,
  "g.10.2": g102,
  "g.10.3": g103,
  "g.10.4": g104,
  "g.10.5": g105,
  "g.10.6": g106,
  "h8.ee.a2": h8eea2,
  "h8.g.a2": h8ga2,
  "h8.g.b3": h8gb3,
  "h8.g.b4": h8gb4,
  "h8.g.b5": h8gb5,
  "h8.g.c6": h8gc6,
  "h8.ee.c8b": h8eec8b,
  "h8.g.a1d": h8ga1d,
  "h8.ee.b5": h8eeb5,
  "h8.ee.b6": h8eeb6,
  "h8.ee.c8a": h8eec8a,
  "h8.ee.c9": h8eec9,
  "h8.f.a1": h8fa1,
  "h8.f.a2": h8fa2,
  "h8.f.a3": h8fa3,
  "h8.f.b4": h8fb4,
  "h8.f.b5": h8fb5,
  "h8.sp.a2": h8spa2,
};

export const IMPLEMENTED_SKILLS = Object.keys(GENERATORS);

export function generatorFor(skill: string): Generator {
  const g = GENERATORS[skill];
  if (!g) throw new Error(`no generator for skill ${skill}`);
  return g;
}
