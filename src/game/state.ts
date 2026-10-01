// Session context shared by every scene: the save file, the schedule, the skill
// catalog, and the derived "what is open right now" answers.
//
// Scenes read from here and call save() after every attempt (KICKOFF Phase 2).

import curriculumJson from "../data/curriculum.json";
import scheduleJson from "../data/schedule.json";
import { load, save as persist, type SaveFile } from "./save";
import { openUnits, withDateOverrides, type Schedule, type ScheduleUnit } from "../engine/scheduler";
import { statusFor, masteryScore } from "../engine/mastery";
import { tierFor } from "../engine/tiers";
import type { QueueSkill } from "../engine/queue";
import type { SystemsStatus, Tier } from "../engine/types";
import { IMPLEMENTED_SKILLS } from "../generators/index";
import { wornValue } from "../data/shop";
import { C } from "../ui/tokens";

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

  /**
   * The schedule the game actually runs on: the shipped dates with the parent's
   * edits folded in. Every scene reads this rather than the raw JSON, so the
   * hangar, the campaign gate and the /dad view can never disagree about when a
   * chapter opens.
   */
  /**
   * The cockpit accent colour: whatever HUD was bought and is being worn, or
   * the green it ships with.
   */
  get hudColor(): string {
    const key = wornValue(this.file.hud, "hud");
    return key ? (C as unknown as Record<string, string>)[key] ?? C.hud : C.hud;
  }

  /** The lock style being worn, or the ring and brackets it ships with. */
  get reticleStyle(): string {
    return wornValue(this.file.reticle, "reticle") ?? "ring";
  }

  get schedule(): Schedule {
    return withDateOverrides(schedule, this.file.scheduleDates);
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
      // this.schedule, not the raw JSON: the parent's date edits fold in here.
      // Since the 2026-09-30 unlock ruling the dates no longer gate anything;
      // every scheduled unit is open.
      schedule: this.schedule,
    };
  }

  get openUnits(): ScheduleUnit[] {
    return openUnits(this.unlockInput());
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

  /**
   * How many skills are MASTERED, which is what a rank is counted in.
   *
   * DESIGN_RECONCILIATION.md section 4 says ranks "advance on total mastered
   * skills" without saying what mastered means; ONLINE is the status at which
   * the systems panel calls a skill done, so that is the bar. Honors skills
   * count: they are skills the pilot has mastered.
   */
  masteredCount(file: SaveFile = this.file): number {
    return curriculum.skills.filter((s) => {
      const st = statusFor(file.log, s.id);
      return st === "ONLINE" || st === "OPTIMIZED";
    }).length;
  }

  /**
   * The airframe the pilot is flying right now: the newest one unlocked.
   *
   * design/README.md makes each chapter boss unlock the next airframe in the
   * chain, so the newest one is the reward for the last boss passed. Every
   * scene that draws the player, awards an intel card or opens the dossier
   * asks here, so the sortie, the debrief and the dossier never disagree.
   * Flight school is the exception and stays on the T-38 on purpose.
   */
  currentAirframe(file: SaveFile = this.file): string {
    return file.unlockedAirframes[file.unlockedAirframes.length - 1] ?? "t38";
  }

  /**
   * Is every CORE skill of the year at ONLINE or better?
   *
   * design/README.md makes this the gate on the Blackbird. Honors skills are
   * left out on purpose: the same document says honors work is never required
   * for a boss or an unlock unless the parent turns that on.
   */
  allOnline(file: SaveFile = this.file): boolean {
    const core = curriculum.skills.filter((s) => !s.honors);
    return core.every((s) => {
      const st = statusFor(file.log, s.id);
      return st === "ONLINE" || st === "OPTIMIZED";
    });
  }
}

/** One instance per page load, handed to every scene through the registry. */
export const gameState = new GameState();
