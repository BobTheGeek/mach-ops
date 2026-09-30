import { describe, it, expect } from "vitest";
import {
  attemptsOf, topError, heatOf, chapterOf, buildRow, buildReport, allRows, accuracyOf,
  summarise, csvCell, toCsv, CSV_HEADER, scheduleRows, activityByDay, localDay,
  STRONG_AT, FLAGGED_BELOW,
  type ReportInput, type RegistrySkillLite, type ChapterLite,
} from "../../src/dad/report";
import { newSave, type SaveFile } from "../../src/game/save";
import { BOSS_UNLOCKS } from "../../src/data/campaign";
import type { Attempt } from "../../src/engine/types";
import type { Schedule } from "../../src/engine/scheduler";
import curriculumJson from "../../src/data/curriculum.json";
import scheduleJson from "../../src/data/schedule.json";

const curriculum = curriculumJson as unknown as {
  chapters: ChapterLite[];
  skills: RegistrySkillLite[];
};
const schedule = scheduleJson as unknown as Schedule;

/** One answer. The fields the report never reads are filled in plausibly. */
function attempt(skill: string, correct: boolean, over: Partial<Attempt> = {}): Attempt {
  return {
    skill, tier: 1, correct, responseMs: 4000, hintsUsed: 0,
    context: "sortie", ts: Date.parse("2026-09-01T12:00:00Z"), ...over,
  };
}

function withLog(log: Attempt[]): SaveFile {
  return { ...newSave(), log };
}

/** Everything open, so availability never masks what a test is checking. */
function input(file: SaveFile, now = Date.parse("2027-06-01T00:00:00Z")): ReportInput {
  return { file, skills: curriculum.skills, chapters: curriculum.chapters, schedule, now };
}

describe("attemptsOf", () => {
  it("picks out one skill's answers and leaves the rest", () => {
    const log = [attempt("ns.1.1", true), attempt("ns.1.2", false), attempt("ns.1.1", false)];
    expect(attemptsOf(log, "ns.1.1")).toHaveLength(2);
    expect(attemptsOf(log, "nothing")).toEqual([]);
  });
});

describe("topError", () => {
  it("is null when nothing was tagged", () => {
    expect(topError([attempt("x", true), attempt("x", false)])).toBeNull();
  });

  it("names the tag picked most often, with its count", () => {
    const log = [
      attempt("x", false, { errorTag: "sign-flip" }),
      attempt("x", false, { errorTag: "double-neg" }),
      attempt("x", false, { errorTag: "sign-flip" }),
    ];
    expect(topError(log)).toEqual({ tag: "sign-flip", count: 2 });
  });

  it("breaks a tie on the tag name, so the table does not reshuffle", () => {
    const log = [
      attempt("x", false, { errorTag: "zebra" }),
      attempt("x", false, { errorTag: "alpha" }),
    ];
    expect(topError(log)?.tag).toBe("alpha");
  });
});

describe("heatOf", () => {
  it("draws a chapter that has not opened as unavailable, whatever the score", () => {
    expect(heatOf(100, false)).toBe("unavailable");
    expect(heatOf(null, false)).toBe("unavailable");
  });

  it("separates unseen from scored", () => {
    expect(heatOf(null, true)).toBe("unseen");
  });

  it("puts the design's thresholds on the right side of the boundary", () => {
    expect(heatOf(STRONG_AT, true)).toBe("strong");
    expect(heatOf(STRONG_AT - 1, true)).toBe("steady");
    expect(heatOf(FLAGGED_BELOW, true)).toBe("steady");
    expect(heatOf(FLAGGED_BELOW - 1, true)).toBe("flagged");
    expect(heatOf(0, true)).toBe("flagged");
  });
});

describe("chapterOf", () => {
  it("uses a core skill's own chapter", () => {
    expect(chapterOf({ id: "a", name: "a", honors: false, chapter: "ch3" })).toBe("ch3");
  });

  it("puts an honors skill in the first chapter it is attached to", () => {
    expect(chapterOf({ id: "a", name: "a", honors: true, attachTo: ["ch4", "ch5"] })).toBe("ch4");
  });
});

describe("buildRow", () => {
  const skill = curriculum.skills.find((s) => s.id === "ns.1.1")!;

  it("reports a skill never attempted as unseen with no accuracy", () => {
    const row = buildRow(input(newSave()), skill, true);
    expect(row.attempts).toBe(0);
    expect(row.accuracy).toBeNull();
    expect(row.lastSeen).toBeNull();
    expect(row.heat).toBe("unseen");
  });

  it("falls back to all attempts when nothing carries a first-try flag", () => {
    const log = [
      attempt("ns.1.1", true), attempt("ns.1.1", true), attempt("ns.1.1", false),
    ];
    const row = buildRow(input(withLog(log)), skill, true);
    expect(row.attempts).toBe(3);
    expect(row.correct).toBe(2);
    expect(row.accuracy).toBe(67);
    expect(row.basis).toBe("all-attempts");
    expect(row.heat).toBe("flagged");
  });

  it("scores on first tries alone once the log records them", () => {
    // Right first time, then wrong twice on retries of other problems.
    const log = [
      attempt("ns.1.1", true, { firstTry: true }),
      attempt("ns.1.1", false, { firstTry: false }),
      attempt("ns.1.1", false, { firstTry: false }),
    ];
    const row = buildRow(input(withLog(log)), skill, true);
    expect(row.attempts).toBe(3);
    expect(row.correct).toBe(1);
    expect(row.firstTries).toBe(1);
    expect(row.firstTryCorrect).toBe(1);
    expect(row.accuracy).toBe(100);
    expect(row.basis).toBe("first-try");
    expect(row.heat).toBe("strong");
  });

  it("takes lastSeen from the most recent attempt, not the last in the array", () => {
    const late = Date.parse("2026-10-01T09:00:00Z");
    const log = [
      attempt("ns.1.1", true, { ts: late }),
      attempt("ns.1.1", true, { ts: Date.parse("2026-09-01T09:00:00Z") }),
    ];
    expect(buildRow(input(withLog(log)), skill, true).lastSeen).toBe(late);
  });
});

describe("buildReport", () => {
  const report = buildReport(input(newSave()));

  it("has one group per quarter in the schedule", () => {
    expect(report.map((q) => q.quarter)).toEqual(schedule.quarters.map((q) => q.q));
  });

  it("files every registry skill exactly once", () => {
    const ids = allRows(report).map((r) => r.id).sort();
    expect(ids).toEqual(curriculum.skills.map((s) => s.id).sort());
  });

  it("puts each chapter under the quarter the curriculum gives it", () => {
    for (const q of report) {
      for (const c of q.chapters) expect(c.quarter, c.chapter).toBe(q.quarter);
    }
  });

  it("carries the honors flag through from the registry", () => {
    const rows = allRows(report);
    for (const s of curriculum.skills) {
      expect(rows.find((r) => r.id === s.id)!.honors, s.id).toBe(s.honors);
    }
  });

  it("averages a chapter only over the skills actually attempted", () => {
    const first = curriculum.skills.filter((s) => chapterOf(s) === "ch1");
    const log = [attempt(first[0]!.id, true), attempt(first[0]!.id, false)];
    const ch1 = buildReport(input(withLog(log)))
      .flatMap((q) => q.chapters).find((c) => c.chapter === "ch1")!;
    // One skill at 50%, the rest unattempted and left out of the mean.
    expect(ch1.accuracy).toBe(50);
  });

  it("leaves a chapter with nothing attempted at a null average", () => {
    const ch = buildReport(input(newSave())).flatMap((q) => q.chapters)[0]!;
    expect(ch.accuracy).toBeNull();
  });

  it("marks skills in a chapter the schedule has not opened as unavailable", () => {
    // Before the first quarter starts, nothing is open.
    const early = buildReport(input(newSave(), Date.parse("2026-01-01T00:00:00Z")));
    expect(allRows(early).every((r) => r.heat === "unavailable")).toBe(true);
  });
});

describe("summarise", () => {
  it("reports an untouched save as all unseen and no accuracy", () => {
    const file = newSave();
    const s = summarise(buildReport(input(file)), file);
    expect(s.total).toBe(curriculum.skills.length);
    expect(s.attempts).toBe(0);
    expect(s.accuracy).toBeNull();
    expect(s.unseen).toBe(s.total);
    expect(s.online).toBe(0);
    expect(s.lastSeen).toBeNull();
  });

  it("counts attempts and accuracy across the whole log", () => {
    const file = withLog([
      attempt("ns.1.1", true), attempt("ns.1.2", false),
      attempt("ns.1.3", true), attempt("ns.1.4", true),
    ]);
    const s = summarise(buildReport(input(file)), file);
    expect(s.attempts).toBe(4);
    expect(s.accuracy).toBe(75);
  });
});

describe("csv", () => {
  it("quotes every field and doubles an embedded quote", () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(12)).toBe('"12"');
  });

  it("writes a header plus one line per skill, and ends with a newline", () => {
    const rows = allRows(buildReport(input(newSave())));
    const csv = toCsv(rows);
    const lines = csv.trimEnd().split("\n");
    expect(csv.endsWith("\n")).toBe(true);
    expect(lines).toHaveLength(rows.length + 1);
    expect(lines[0]).toBe(CSV_HEADER.map((h) => `"${h}"`).join(","));
  });

  it("gives every line the same number of fields as the header", () => {
    const csv = toCsv(allRows(buildReport(input(withLog([
      attempt("ns.1.1", false, { errorTag: 'has "quotes"' }),
    ])))));
    for (const line of csv.trimEnd().split("\n")) {
      // Fields are always quoted, so commas inside them never split a row.
      expect(line.match(/(^|,)"([^"]|"")*"/g)!.length).toBe(CSV_HEADER.length);
    }
  });
});

describe("scheduleRows", () => {
  const rows = scheduleRows(input(newSave()), curriculum.chapters, BOSS_UNLOCKS);

  it("has one row per scheduled unit, in schedule order", () => {
    expect(rows.map((r) => r.unit.id)).toEqual(schedule.units.map((u) => u.id));
  });

  it("names the airframe each boss earns, and none for the first chapter", () => {
    expect(rows.find((r) => r.unit.id === "ch2")!.earns).toBe("f4");
    expect(rows.find((r) => r.unit.id === "ch1")!.earns).toBeNull();
  });

  it("marks a unit the parent has forced as overridden", () => {
    const file: SaveFile = { ...newSave(), scheduleOverrides: { ch5: true } };
    const forced = scheduleRows(input(file), curriculum.chapters, BOSS_UNLOCKS);
    expect(forced.find((r) => r.unit.id === "ch5")!.overridden).toBe(true);
    expect(forced.find((r) => r.unit.id === "ch5")!.open).toBe(true);
    expect(forced.find((r) => r.unit.id === "ch6")!.overridden).toBe(false);
  });

  it("lets the parent force a unit shut even after its date", () => {
    const file: SaveFile = { ...newSave(), scheduleOverrides: { ch1: false } };
    const late = Date.parse("2027-06-01T00:00:00Z");
    const forced = scheduleRows(input(file, late), curriculum.chapters, BOSS_UNLOCKS);
    expect(forced.find((r) => r.unit.id === "ch1")!.open).toBe(false);
  });
});

describe("activityByDay", () => {
  it("is empty for an empty log", () => {
    expect(activityByDay([])).toEqual([]);
  });

  it("groups by local day, newest first, counting distinct skills", () => {
    const d1 = new Date(2026, 8, 1, 10, 0, 0).getTime();
    const d2 = new Date(2026, 8, 2, 10, 0, 0).getTime();
    const days = activityByDay([
      attempt("ns.1.1", true, { ts: d1 }),
      attempt("ns.1.1", false, { ts: d1 }),
      attempt("ns.1.2", true, { ts: d1 }),
      attempt("ns.1.3", true, { ts: d2 }),
    ]);
    expect(days.map((d) => d.day)).toEqual([localDay(d2), localDay(d1)]);
    expect(days[1]).toEqual({ day: localDay(d1), attempts: 3, correct: 2, skills: 2 });
  });

  it("uses the local calendar day, not UTC", () => {
    // 11pm local on the 1st is the 2nd in UTC for a negative offset.
    const late = new Date(2026, 8, 1, 23, 30, 0).getTime();
    expect(localDay(late)).toBe("2026-09-01");
  });
});

describe("accuracyOf", () => {
  it("has no answer and no basis for an empty log", () => {
    expect(accuracyOf([])).toEqual({
      accuracy: null, basis: null, firstTries: 0, firstTryCorrect: 0,
    });
  });

  it("counts every answer when none is flagged, and says so", () => {
    const r = accuracyOf([attempt("x", true), attempt("x", false)]);
    expect(r).toEqual({ accuracy: 50, basis: "all-attempts", firstTries: 0, firstTryCorrect: 0 });
  });

  it("counts only first tries when any are flagged", () => {
    const r = accuracyOf([
      attempt("x", true, { firstTry: true }),
      attempt("x", false, { firstTry: true }),
      attempt("x", true, { firstTry: false }),
      attempt("x", true, { firstTry: false }),
    ]);
    expect(r.basis).toBe("first-try");
    expect(r.firstTries).toBe(2);
    expect(r.accuracy).toBe(50);
  });

  // Mixing the two would average a strict measure with a lenient one and call
  // the result either name. A skill is scored one way or the other, never both.
  it("does not mix the two readings on a half-migrated skill", () => {
    const r = accuracyOf([
      attempt("x", false),                       // logged before the flag existed
      attempt("x", true, { firstTry: true }),
    ]);
    expect(r.basis).toBe("first-try");
    expect(r.firstTries).toBe(1);
    expect(r.accuracy).toBe(100);
  });

  it("treats a missing flag as unrecorded, not as a retry", () => {
    // If undefined counted as firstTry:false, this would report no first tries.
    const r = accuracyOf([attempt("x", true), attempt("x", true)]);
    expect(r.accuracy).toBe(100);
    expect(r.basis).toBe("all-attempts");
  });
});

describe("the summary uses the same rule as a row", () => {
  it("reports first-try accuracy and names the basis", () => {
    const file = withLog([
      attempt("ns.1.1", true, { firstTry: true }),
      attempt("ns.1.1", false, { firstTry: false }),
    ]);
    const s = summarise(buildReport(input(file)), file);
    expect(s.accuracy).toBe(100);
    expect(s.basis).toBe("first-try");
    expect(s.attempts).toBe(2);
  });

  it("names the fallback on a save written before the flag existed", () => {
    const file = withLog([attempt("ns.1.1", true), attempt("ns.1.2", false)]);
    const s = summarise(buildReport(input(file)), file);
    expect(s.accuracy).toBe(50);
    expect(s.basis).toBe("all-attempts");
  });
});

describe("fluency and hints in the report", () => {
  const skill = curriculum.skills.find((s) => s.id === "ns.1.1")!;

  it("counts hint presses and manual opens against the skill", () => {
    const log = [
      attempt("ns.1.1", true, { hintsUsed: 1 }),
      attempt("ns.1.1", false, { hintsUsed: 2 }),
      attempt("ns.1.1", true, { hintsUsed: 0 }),
    ];
    expect(buildRow(input(withLog(log)), skill, true).hints).toBe(3);
  });

  it("takes the median pace from correct answers only", () => {
    const log = [
      attempt("ns.1.1", true, { responseMs: 2000 }),
      attempt("ns.1.1", true, { responseMs: 6000 }),
      attempt("ns.1.1", false, { responseMs: 60_000 }),
    ];
    expect(buildRow(input(withLog(log)), skill, true).medianCorrectMs).toBe(4000);
  });

  it("reports no pace for a skill with no correct answers", () => {
    const log = [attempt("ns.1.1", false), attempt("ns.1.1", false)];
    expect(buildRow(input(withLog(log)), skill, true).medianCorrectMs).toBeNull();
  });

  it("carries both into the CSV", () => {
    const log = [attempt("ns.1.1", true, { hintsUsed: 1, responseMs: 3000 })];
    const csv = toCsv([buildRow(input(withLog(log)), skill, true)]);
    const [header, row] = csv.trim().split("\n");
    expect(header).toContain('"hints"');
    expect(header).toContain('"median_correct_ms"');
    expect(row).toContain('"3000"');
  });
});
