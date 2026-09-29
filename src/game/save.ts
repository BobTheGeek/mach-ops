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
  /** mission ids flown to a debrief, in order */
  missionsFlown: string[];
  /** sorties completed with enough first-try hits to earn an intel card */
  sortiesFlown: number;
  /** every answered problem, oldest first */
  log: Attempt[];
  /** per skill, the tier it is currently serving */
  tiers: Record<string, Tier>;
  /** problem hashes already served, newest last, capped at RECENT_HASHES */
  recentHashes: string[];
  /** airframe id -> chosen livery id; absent or "" means the standard scheme */
  paint: Record<string, string>;
  /** shop item ids bought. Cosmetics only: nothing here changes the maths. */
  owned: string[];
  /** the bought look currently worn: "" is the one he started with */
  hud: string;
  reticle: string;
  /** bests worth chasing, which the log alone cannot answer cheaply */
  records: Records;
  /** first-time tip ids already dismissed */
  tipsSeen: string[];
  flightSchoolDone: boolean;
  settings: Settings;
  /** /dad overrides: unit id -> forced open/closed */
  scheduleOverrides: Record<string, boolean>;
  /**
   * /dad date edits: unit id -> ISO date, replacing the one in schedule.json.
   *
   * Separate from scheduleOverrides because they answer different questions:
   * this moves when a chapter opens, that forces it open or shut regardless.
   */
  scheduleDates: Record<string, string>;
  parentToggles: ParentToggles;
}

/**
 * Personal bests.
 *
 * Kept on the file rather than derived, because two of the three are per-sortie
 * facts the attempt log does not record: it knows every answer but not which
 * sortie each belonged to.
 */
export interface Records {
  /** milliseconds, the quickest sortie flown to a debrief */
  fastestSortieMs: number | null;
  /** most first-try hits in a single sortie */
  mostFirstTryHits: number;
  /** most credits taken from one sortie */
  bestSortieCredits: number;
}

export const NO_RECORDS: Records = {
  fastestSortieMs: null,
  mostFirstTryHits: 0,
  bestSortieCredits: 0,
};

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
    missionsFlown: [],
    sortiesFlown: 0,
    log: [],
    tiers: {},
    recentHashes: [],
    paint: {},
    owned: [],
    hud: "",
    reticle: "",
    records: { ...NO_RECORDS },
    tipsSeen: [],
    flightSchoolDone: false,
    settings: { volume: 0.7, keypadEntry: false, colorblindHud: false, reducedMotion: false },
    scheduleOverrides: {},
    scheduleDates: {},
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

/**
 * The streak pays. Each answer in an unbroken run adds 10% to what the next one
 * earns, capped at double.
 *
 * The streak used to be a number on the HUD that did nothing, which made a wrong
 * answer nearly free and guessing the fastest route to the next bogey. A run
 * worth protecting is the strongest lever the game has on care, and it costs
 * nothing when broken: a miss drops the multiplier back to 1, never below.
 */
export const STREAK_STEP = 0.1;
export const STREAK_CAP = 2;

/** The multiplier a run of this length has earned. Always at least 1. */
export function streakMultiplier(streak: number): number {
  return Math.min(STREAK_CAP, 1 + Math.max(0, streak - 1) * STREAK_STEP);
}

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
  const streak = r.attempt.correct ? file.streak + 1 : 0;
  // The run this answer is part of, so the first correct answer pays x1 and the
  // multiplier is visibly earned rather than granted.
  const credits = r.attempt.correct
    ? Math.round(BASE_CREDITS * (r.fastBonus ? FAST_MULTIPLIER : 1) * streakMultiplier(streak))
    : 0;

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

/**
 * Close out a sortie: count it, remember the mission, and award the next intel
 * card when the pilot made enough first-try hits (Screens 08 and How to Play
 * HP5: "a sortie with 6+ first-try hits earns one").
 */
export function completeSortie(
  file: SaveFile,
  opts: { missionId: string; airframe: string; firstTryHits: number; hitsNeeded: number; cardsPerAirframe: number },
): { file: SaveFile; cardEarned: number | null } {
  const flown = file.missionsFlown.includes(opts.missionId)
    ? file.missionsFlown
    : [...file.missionsFlown, opts.missionId];

  let next: SaveFile = { ...file, missionsFlown: flown, sortiesFlown: file.sortiesFlown + 1 };

  const have = next.intelCards[opts.airframe] ?? [];
  const earnsCard = opts.firstTryHits >= opts.hitsNeeded && have.length < opts.cardsPerAirframe;
  if (!earnsCard) return { file: next, cardEarned: null };

  const card = have.length + 1;
  next = earnIntelCard(next, opts.airframe, card);
  return { file: next, cardEarned: card };
}

export function passBoss(file: SaveFile, unitId: string): SaveFile {
  return file.bossesPassed.includes(unitId) ? file : { ...file, bossesPassed: [...file.bossesPassed, unitId] };
}

export function earnIntelCard(file: SaveFile, airframe: string, card: number): SaveFile {
  const have = file.intelCards[airframe] ?? [];
  if (have.includes(card)) return file;
  return { ...file, intelCards: { ...file.intelCards, [airframe]: [...have, card].sort((a, b) => a - b) } };
}

/** Rename the pilot. Blank or whitespace keeps the one they had. */
export function setCallsign(file: SaveFile, callsign: string): SaveFile {
  const clean = callsign.trim().toUpperCase().slice(0, 12);
  return clean.length === 0 ? file : { ...file, callsign: clean };
}

/** Choose a paint scheme for one airframe. An empty id is the standard one. */
export function setPaint(file: SaveFile, airframe: string, livery: string): SaveFile {
  return { ...file, paint: { ...file.paint, [airframe]: livery } };
}

/** Move a chapter's opening date. A blank date clears the edit. */
export function setChapterDate(file: SaveFile, unitId: string, iso: string): SaveFile {
  const next = { ...file.scheduleDates };
  if (iso === "") delete next[unitId];
  else next[unitId] = iso;
  return { ...file, scheduleDates: next };
}

/** Buy a cosmetic. Refuses quietly when it is already owned or unaffordable. */
export function buyItem(file: SaveFile, id: string, cost: number): SaveFile {
  if (file.owned.includes(id) || file.credits < cost) return file;
  return { ...file, credits: file.credits - cost, owned: [...file.owned, id] };
}

export const owns = (file: SaveFile, id: string): boolean => file.owned.includes(id);

/** Fold one finished sortie into the personal bests. */
export function recordBests(
  file: SaveFile,
  sortie: { durationMs: number; firstTryHits: number; credits: number },
): SaveFile {
  const r = file.records;
  return {
    ...file,
    records: {
      fastestSortieMs: r.fastestSortieMs === null
        ? sortie.durationMs
        : Math.min(r.fastestSortieMs, sortie.durationMs),
      mostFirstTryHits: Math.max(r.mostFirstTryHits, sortie.firstTryHits),
      bestSortieCredits: Math.max(r.bestSortieCredits, sortie.credits),
    },
  };
}

/** Wear a bought look. An empty id goes back to the default. */
export function equip(file: SaveFile, slot: "hud" | "reticle", id: string): SaveFile {
  if (id !== "" && !file.owned.includes(id)) return file;
  return { ...file, [slot]: id };
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
    const fresh = newSave();
    return {
      ...fresh,
      ...parsed,
      settings: { ...fresh.settings, ...(parsed.settings ?? {}) },
      records: { ...fresh.records, ...(parsed.records ?? {}) },
    };
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
