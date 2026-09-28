// Session context shared by every scene: the save file, the schedule, the skill
// catalog, and the derived "what is open right now" answers.
//
// Scenes read from here and call save() after every attempt (KICKOFF Phase 2).

import curriculumJson from "../data/curriculum.json";
import scheduleJson from "../data/schedule.json";
import { load, save as persist, type SaveFile } from "./save";
import { activeUnit, openUnits, type Schedule, type ScheduleUnit } from "../engine/scheduler";
import { statusFor, masteryScore } from "../engine/mastery";
import { tierFor } from "../engine/tiers";
import type { QueueSkill } from "../engine/queue";
import type { SystemsStatus, Tier } from "../engine/types";
import { IMPLEMENTED_SKILLS } from "../generators/index";

export interface RegistrySkill {
  id: string;
  name: string;
  key: string;
  chapter?: string;
  section?: string;
  honors: boolean;
  attachTo?: string[];
  standards: string[];
  tiers: string[];
  errors: { tag: string; desc: string; distractor: string }[];
  reps: string[];
  formats: string[];
  skin: string;
}

export interface Chapter {
  id: string;
  n: number;
  quarter: number;
  name: string;
  tnCluster?: string;
}

const curriculum = curriculumJson as unknown as { chapters: Chapter[]; skills: RegistrySkill[] };
const schedule = scheduleJson as unknown as Schedule;

/**
 * The date the game treats as "now".
 *
 * The schedule's placeholder dates start in August 2026, so on a real clock
 * before then nothing is open and the hangar is empty. Until the FSD calendar
 * lands, a dev override keeps the build playable; clearing it falls back to the
 * real clock, which is what ships.
 */
const DEV_DATE_KEY = "machops.devDate";

export function now(): number {
  const override = globalThis.localStorage?.getItem(DEV_DATE_KEY);
  if (override) {
    const t = Date.parse(override);
    if (!Number.isNaN(t)) return t;
  }
  const real = Date.now();
  const firstUnitOpens = Date.parse(`${schedule.units[0]!.opens}T00:00:00Z`);
  // Before the school year starts there is nothing to play; open Chapter 1 so
  // the build is testable. Remove once real dates are in.
  return real < firstUnitOpens ? firstUnitOpens : real;
}

export class GameState {
  file: SaveFile;

  constructor() {
    this.file = load();
  }

  save(): void {
    persist(this.file);
  }

  update(next: SaveFile): void {
    this.file = next;
    this.save();
  }

  /* ------------------------------------------------------- curriculum */

  get chapters(): Chapter[] {
    return curriculum.chapters;
  }

  get schedule(): Schedule {
    return schedule;
  }

  skill(id: string): RegistrySkill {
    const s = curriculum.skills.find((x) => x.id === id);
    if (!s) throw new Error(`unknown skill ${id}`);
    return s;
  }

  chapter(id: string): Chapter {
    const c = curriculum.chapters.find((x) => x.id === id);
    if (!c) throw new Error(`unknown chapter ${id}`);
    return c;
  }

  /** Skills in a chapter, including the honors skills attached to it. */
  skillsIn(unitId: string): RegistrySkill[] {
    return curriculum.skills.filter(
      (s) => (!s.honors && s.chapter === unitId) || (s.honors && (s.attachTo ?? []).includes(unitId)),
    );
  }

  /** Phase 1 shipped Chapter 1 generators only; the rest cannot be served yet. */
  get playableSkills(): QueueSkill[] {
    const implemented = new Set(IMPLEMENTED_SKILLS);
    return curriculum.skills
      .filter((s) => implemented.has(s.id))
      .map((s) => ({
        id: s.id,
        ...(s.chapter ? { chapter: s.chapter } : {}),
        honors: s.honors,
        ...(s.attachTo ? { attachTo: s.attachTo } : {}),
      }));
  }

  isPlayable(unitId: string): boolean {
    return this.playableSkills.some((s) => (s.chapter ?? s.attachTo?.[0]) === unitId);
  }

  /* ---------------------------------------------------------- schedule */

  private unlockInput() {
    return {
      schedule,
      now: now(),
      bossesPassed: new Set(this.file.bossesPassed),
      overrides: this.file.scheduleOverrides,
      toggles: this.file.parentToggles,
    };
  }

  get openUnits(): ScheduleUnit[] {
    return openUnits(this.unlockInput());
  }

  get activeUnit(): ScheduleUnit | null {
    return activeUnit(this.unlockInput());
  }

  isOpen(unitId: string): boolean {
    return this.openUnits.some((u) => u.id === unitId);
  }

  /* ------------------------------------------------------- progression */

  statusOf(skill: string): SystemsStatus {
    return statusFor(this.file.log, skill);
  }

  scoreOf(skill: string): number {
    return masteryScore(this.file.log, skill);
  }

  tierOf(skill: string): Tier {
    const saved = this.file.tiers[skill];
    return saved ?? tierFor(this.file.log, skill).tier;
  }

  /** Chapter progress as a 0..1 fraction of skills at ONLINE or better. */
  progressOf(unitId: string): number {
    const skills = this.skillsIn(unitId);
    if (skills.length === 0) return 0;
    const done = skills.filter((s) => {
      const st = this.statusOf(s.id);
      return st === "ONLINE" || st === "OPTIMIZED";
    }).length;
    return done / skills.length;
  }
}

/** One instance per page load, handed to every scene through the registry. */
export const gameState = new GameState();
