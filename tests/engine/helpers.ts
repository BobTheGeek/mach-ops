// Synthetic attempt logs for the engine tests.

import type { Attempt, AttemptContext, Tier } from "../../src/engine/types";
import { DAY_MS } from "../../src/engine/scheduler";

export const T0 = Date.parse("2026-09-01T12:00:00Z");

export interface AttemptOpts {
  skill?: string;
  tier?: Tier;
  correct?: boolean;
  responseMs?: number;
  hintsUsed?: number;
  context?: AttemptContext;
  errorTag?: string;
  day?: number;
}

export function attempt(o: AttemptOpts = {}): Attempt {
  return {
    skill: o.skill ?? "ns.1.1",
    tier: o.tier ?? 1,
    correct: o.correct ?? true,
    responseMs: o.responseMs ?? 3000,
    hintsUsed: o.hintsUsed ?? 0,
    context: o.context ?? "sortie",
    ...(o.errorTag ? { errorTag: o.errorTag } : {}),
    ts: T0 + (o.day ?? 0) * DAY_MS,
  };
}

export const fastCorrect = (o: AttemptOpts = {}): Attempt => attempt({ ...o, correct: true, responseMs: 2000 });
export const fastWrong = (o: AttemptOpts = {}): Attempt => attempt({ ...o, correct: false, responseMs: 2000 });
export const slowCorrect = (o: AttemptOpts = {}): Attempt => attempt({ ...o, correct: true, responseMs: 20000 });
export const slowWrong = (o: AttemptOpts = {}): Attempt => attempt({ ...o, correct: false, responseMs: 20000 });
