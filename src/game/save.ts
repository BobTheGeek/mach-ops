// The pilot's save file. One key in localStorage, written after every attempt
// (KICKOFF Phase 2). Shape follows design/README.md "State management".
//
// The store is a plain object plus pure reducers so it can be tested without a
// browser; only load()/save() touch localStorage.

import type { Attempt, Tier } from "../engine/types";
import { STRUCTURE } from "../ui/tokens";

export const SAVE_KEY = "machops.save.v1";

/** GENERATOR_SPEC section 6: the no-repeat guard remembers the last 500 hashes. */
export const RECENT_HASHES = 500;

export interface Settings {
  /** 0..1, ducks 50% under bullet-time */
  volume: number;
  /** touchpad-only Chromebooks type on an on-screen keypad */
  keypadEntry: boolean;
  /** adds shapes and labels to every state */
  colorblindHud: boolean;
  reducedMotion: boolean;
}

export interface ParentToggles {
  allowEarlyUnlockOnBossPass: boolean;
  honorsRequiredForBoss: boolean;
}

export interface SaveFile {
  version: 1;
  callsign: string;
  credits: number;
  streak: number;
  bestStreak: number;
  /** airframe ids in unlock order; t38 is always unlocked */
  unlockedAirframes: string[];
  /** airframe id -> intel card indices earned (10 per airframe) */
  intelCards: Record<string, number[]>;
  /** unit ids whose boss sortie has been passed */
  bossesPassed: string[];
  /** every answered problem, oldest first */
  log: Attempt[];
  /** per skill, the tier it is currently serving */
  tiers: Record<string, Tier>;
  /** problem hashes already served, newest last, capped at RECENT_HASHES */
  recentHashes: string[];
  /** first-time tip ids already dismissed */
  tipsSeen: string[];
  flightSchoolDone: boolean;
  settings: Settings;
  /** /dad overrides: unit id -> forced open/closed */
  scheduleOverrides: Record<string, boolean>;
  parentToggles: ParentToggles;
}

export function newSave(): SaveFile {
  const firstAirframe = STRUCTURE.airframes[0] ?? "t38";
  return {
    version: 1,
    callsign: "MAVERICK",
    credits: 0,
    streak: 0,
    bestStreak: 0,
    unlockedAirframes: [firstAirframe],
    intelCards: { [firstAirframe]: [] },
    bossesPassed: [],
    log: [],
    tiers: {},
    recentHashes: [],
    tipsSeen: [],
    flightSchoolDone: false,
    settings: { volume: 0.7, keypadEntry: false, colorblindHud: false, reducedMotion: false },
    scheduleOverrides: {},
    parentToggles: { allowEarlyUnlockOnBossPass: false, honorsRequiredForBoss: false },
  };
}

/* ------------------------------------------------------------ reducers */

/** Credits for one correct answer, before the fast bonus. */
export const BASE_CREDITS = 100;
/** DESIGN_RECONCILIATION section 4: fast correct is x1.5 credits. */
export const FAST_MULTIPLIER = 1.5;
/** HINT costs 50 credits and forfeits the fast bonus. */
export const HINT_COST = 50;

export interface RecordResult {
  attempt: Attempt;
  /** true when the answer landed inside the fast window and no hint was taken */
  fastBonus: boolean;
  hash: string;
  nextTier: Tier;
}

/**
 * Fold one answered problem into the save. Pure: returns a new file, so the
 * caller decides when to persist.
 */
export function recordAttempt(file: SaveFile, r: RecordResult): SaveFile {
  const credits = r.attempt.correct
    ? Math.round(BASE_CREDITS * (r.fastBonus ? FAST_MULTIPLIER : 1))
    : 0;
  const streak = r.attempt.correct ? file.streak + 1 : 0;

  return {
    ...file,
    credits: file.credits + credits,
    streak,
    bestStreak: Math.max(file.bestStreak, streak),
    log: [...file.log, r.attempt],
    tiers: { ...file.tiers, [r.attempt.skill]: r.nextTier },
    recentHashes: [...file.recentHashes, r.hash].slice(-RECENT_HASHES),
  };
}

export function spendCredits(file: SaveFile, amount: number): SaveFile {
  return { ...file, credits: Math.max(0, file.credits - amount) };
}

export function seeTip(file: SaveFile, tipId: string): SaveFile {
  return file.tipsSeen.includes(tipId) ? file : { ...file, tipsSeen: [...file.tipsSeen, tipId] };
}

export function passBoss(file: SaveFile, unitId: string): SaveFile {
  return file.bossesPassed.includes(unitId) ? file : { ...file, bossesPassed: [...file.bossesPassed, unitId] };
}

export function earnIntelCard(file: SaveFile, airframe: string, card: number): SaveFile {
  const have = file.intelCards[airframe] ?? [];
  if (have.includes(card)) return file;
  return { ...file, intelCards: { ...file.intelCards, [airframe]: [...have, card].sort((a, b) => a - b) } };
}

export function unlockAirframe(file: SaveFile, airframe: string): SaveFile {
  if (file.unlockedAirframes.includes(airframe)) return file;
  return {
    ...file,
    unlockedAirframes: [...file.unlockedAirframes, airframe],
    intelCards: { ...file.intelCards, [airframe]: file.intelCards[airframe] ?? [] },
  };
}

export const hasSeenHash = (file: SaveFile, hash: string): boolean => file.recentHashes.includes(hash);

/* ------------------------------------------------------- persistence */

/** Missing, unreadable or wrong-version saves start a fresh pilot rather than throw. */
export function load(storage: Storage = globalThis.localStorage): SaveFile {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return newSave();
    const parsed = JSON.parse(raw) as Partial<SaveFile>;
    if (parsed.version !== 1) return newSave();
    // Merge over a fresh file so a save written by an older build gains new keys.
    return { ...newSave(), ...parsed, settings: { ...newSave().settings, ...(parsed.settings ?? {}) } };
  } catch {
    return newSave();
  }
}

export function save(file: SaveFile, storage: Storage = globalThis.localStorage): void {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(file));
  } catch {
    // A full or blocked storage must never interrupt a sortie.
  }
}

export function clear(storage: Storage = globalThis.localStorage): void {
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
