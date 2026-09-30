// 07 Debrief (Systems Sharpened list with Review links) and 07B (sortie ended,
// progress kept).

import Phaser from "phaser";
import { C, N, SIZE, TEXT, TRACK, CANVAS, SCREEN_PAD, STROKE, HIT, hex } from "../../ui/tokens";
import { panel, capsLabel, button, statusPill } from "../ui/kit";
import { ManualPanel } from "../ui/manualPanel";
import { gameState } from "../state";
import { hasPage } from "../manual";
import { completeSortie, passBoss, unlockAirframe, gradeSortie, recordMissionBest, type MissionBest, type SortieGrade } from "../save";
import { mission as findMission, BOSS_UNLOCKS, CAPSTONE_AIRFRAME } from "../../data/campaign";
import { dossier, CARDS_PER_AIRFRAME, FIRST_TRY_HITS_FOR_CARD, type IntelCard } from "../../data/intel";
import { fleetEntry } from "../../data/fleet";
import { audio } from "../audio";

export interface DebriefData {
  unitId: string;
  missionId: string;
  firstTryHits: number;
  problems: number;
  /** contacts allowed past the tail, which cost their credits and their card */
  escaped: number;
  reason: string;
  sharpened: string[];
  fuel: number;
  shields: number;
  failed: boolean;
  /** flight time, ms, for the rating and the per-mission best */
  durationMs: number;
  /** credits the sortie actually earned, for the per-mission best */
  credits: number;
}

/** The left column: the sortie summary, then the intel card under it. */
const SUMMARY_TOP = 80;
/** First row, measured from the panel top; the heading sits above it. */
const ROWS_TOP = 44;
const ROW_GAP = 32;
/** Room under the last row, so a descender is not flush with the border. */
const ROW_PAD = 18;

/** The systems vocabulary, in its usual colours: green, amber, muted. */
const GRADE_COLOR: Record<SortieGrade, string> = {
  OPTIMIZED: C.hud,
  ONLINE: C.lock,
  CALIBRATING: C.textMuted,
};

export class DebriefScene extends Phaser.Scene {
  private debrief!: DebriefData;
  private manual?: ManualPanel;
  /** where the summary panel ended, so the intel panel can follow it */
  private summaryBottom = 0;
  private cardEarned: IntelCard | null = null;
  private unlocked: string | null = null;
  /** how this sortie rated, and the mission's bests including it */
  private grade: SortieGrade = "CALIBRATING";
  private best: MissionBest | null = null;
  /** every distinct skill sharpened, and the page of the list being shown */
  private sharpenedSkills: string[] = [];
  private sharpenedPage = 0;
  private sharpenedLayer?: Phaser.GameObjects.Container;

  constructor() {
    super("Debrief");
  }

  init(data: DebriefData): void {
    this.debrief = data;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(N.ground);

    // Close the sortie out once, here: it is the only place that knows both the
    // mission and the first-try count.
    const airframe = gameState.currentAirframe();
    const result = completeSortie(gameState.file, {
      missionId: this.debrief.missionId,
      airframe,
      firstTryHits: this.debrief.firstTryHits,
      hitsNeeded: FIRST_TRY_HITS_FOR_CARD,
      cardsPerAirframe: CARDS_PER_AIRFRAME,
    });

    // The rating is a fact about this sortie; the best is what the campaign
    // screen shows next time, so a flown mission has something to beat.
    this.grade = gradeSortie({
      firstTryHits: this.debrief.firstTryHits,
      problems: this.debrief.problems,
      escaped: this.debrief.escaped,
      failed: this.debrief.failed,
      hitsNeeded: FIRST_TRY_HITS_FOR_CARD,
    });
    gameState.update(recordMissionBest(result.file, this.debrief.missionId, {
      grade: this.grade,
      firstTryHits: this.debrief.firstTryHits,
      durationMs: this.debrief.durationMs,
    }));
    this.best = gameState.file.missionBests[this.debrief.missionId] ?? null;
    this.unlocked = this.settleBoss();
    this.cardEarned = result.cardEarned
      ? dossier(airframe)?.cards.find((c) => c.n === result.cardEarned) ?? null
      : null;
    audio.setVolume(gameState.file.settings.volume);
    if (this.cardEarned) this.time.delayedCall(400, () => audio.play("intelCard"));

    const title = this.add.text(SCREEN_PAD, 14, this.debrief.failed ? "SORTIE ENDED" : "DEBRIEF", { ...TEXT.h3 });
    title.setLetterSpacing(TRACK.display * SIZE.h3);

    const reason = capsLabel(this, SCREEN_PAD + 220, 22, this.debrief.reason, this.debrief.failed ? C.alert : C.hud, TRACK.readout);
    void reason;

    // Progress is always kept, and the screen says so rather than implying loss.
    const kept = capsLabel(this, 0, 22, "PROGRESS KEPT", C.hud, TRACK.readout);
    kept.setX(CANVAS.width - SCREEN_PAD - kept.width);

    const rule = this.add.graphics();
    rule.lineStyle(STROKE.hairline, hex(C.border), 1);
    rule.lineBetween(SCREEN_PAD, 58, CANVAS.width - SCREEN_PAD, 58);

    this.summary();
    this.intelPanel();
    this.systemsSharpened();
    this.actions();
  }

  private summary(): void {
    const x = SCREEN_PAD;
    const y = SUMMARY_TOP;

    const rows: [string, string, string][] = [
      ["RATING", this.grade, GRADE_COLOR[this.grade]],
      ["FIRST-TRY", `${this.debrief.firstTryHits} / ${this.debrief.problems}`,
        this.debrief.firstTryHits >= FIRST_TRY_HITS_FOR_CARD ? C.hud : C.textMuted],
      ["BEST", this.bestLine(), C.textMuted],
      ["CREDITS", `${this.debrief.credits >= 0 ? "+" : ""}${this.debrief.credits}`, C.lock],
      ["STREAK", `${gameState.file.streak} (BEST ${gameState.file.bestStreak})`, C.text],
      ["ESCAPED", `${this.debrief.escaped}`, this.debrief.escaped > 0 ? C.alert : C.textMuted],
      ["FUEL", `${Math.round(this.debrief.fuel * 100)}%`, C.hud],
      ["SHIELDS", `${Math.round(this.debrief.shields * 100)}%`, C.shield],
    ];
    // Height from the rows, not a number typed once and forgotten. Adding the
    // ESCAPED row is what put SHIELDS 14 px below the bottom edge; deriving it
    // means the next row grows the panel instead of spilling out of it.
    this.summaryBottom = y + ROWS_TOP + rows.length * ROW_GAP + ROW_PAD;
    panel(this, x, y, 340, this.summaryBottom - y, { fill: C.panel });

    const h = capsLabel(this, x + 16, y + 14, "SORTIE", C.hud);
    void h;

    rows.forEach(([label, value, color], i) => {
      const ry = y + ROWS_TOP + i * ROW_GAP;
      const l = capsLabel(this, x + 16, ry, label, C.textMuted, TRACK.readout);
      const v = this.add.text(x + 180, ry - 4, value, { ...TEXT.value, color });
      void l;
      void v;
    });
  }

  /** The mission's bests, which this flight has just been folded into. */
  private bestLine(): string {
    const b = this.best;
    if (!b) return "FIRST FLIGHT";
    return `${b.grade} · ${b.firstTryHits}/${this.debrief.problems} · ${(b.fastestMs / 1000).toFixed(1)} S`;
  }

  /** Screens 08: a sortie with 6+ first-try hits earns one intel card. */
  private intelPanel(): void {
    const x = SCREEN_PAD;
    const y = this.summaryBottom + 24;
    const w = 340;
    const h = 190;
    panel(this, x, y, w, h, { fill: C.panel, border: this.cardEarned ? C.lock : C.border });

    const head = capsLabel(this, x + 16, y + 14, this.cardEarned ? "INTEL CARD EARNED" : "INTEL", C.lock);
    void head;

    const airframe = gameState.currentAirframe();
    const designation = fleetEntry(airframe)?.designation ?? "T-38";
    const have = (gameState.file.intelCards[airframe] ?? []).length;
    // The dossier's own card count, not a constant: the copy must never claim a
    // collection is complete when the airframe has no cards written for it.
    const total = dossier(airframe)?.cards.length ?? CARDS_PER_AIRFRAME;

    if (!this.cardEarned) {
      const need = FIRST_TRY_HITS_FOR_CARD - this.debrief.firstTryHits;
      const copy = this.add.text(x + 16, y + 44,
        need > 0
          ? `${need} more first-try hit${need === 1 ? "" : "s"} in one sortie earns a card.`
          : have >= total
            ? `All ${total} ${designation} intel cards collected.`
            : `${have} of ${total} ${designation} intel cards collected.`,
        { ...TEXT.body, color: C.textMuted, wordWrap: { width: w - 32 } });
      void copy;
      return;
    }

    const code = capsLabel(this, x + 16, y + 40, `${designation} · ${String(this.cardEarned.n).padStart(2, "0")}   ${have} OF ${total}`, C.textMuted, TRACK.readout);
    void code;

    const title = this.add.text(x + 16, y + 62, this.cardEarned.title, { ...TEXT.h3, fontSize: "18px" });
    const body = this.add.text(x + 16, title.y + title.height + 6, this.cardEarned.body, {
      ...TEXT.body, color: C.textMuted, wordWrap: { width: w - 32 }, lineSpacing: 2,
    });
    void body;
  }

  private systemsSharpened(): void {
    const x = SCREEN_PAD + 372;
    const y = 80;
    const w = CANVAS.width - x - SCREEN_PAD;
    const h = CANVAS.height - y - 120;
    panel(this, x, y, w, h, { fill: C.panel });

    const head = capsLabel(this, x + 16, y + 14, "SYSTEMS SHARPENED", C.hud);
    void head;

    this.sharpenedSkills = [...new Set(this.debrief.sharpened)];
    if (this.sharpenedSkills.length === 0) {
      const none = this.add.text(x + 16, y + 52, "No systems came online this sortie. Open the Flight Manual and try again — practice never counts against you.", {
        ...TEXT.body,
        color: C.textMuted,
        wordWrap: { width: w - 32 },
      });
      void none;
      return;
    }

    this.renderSharpenedPage();
  }

  /**
   * One page of the sharpened list.
   *
   * This used to draw whatever fitted and silently drop the rest, so a sortie
   * that touched more than eight skills reported fewer than it earned. A page
   * holds what fits and the arrows account for the remainder.
   */
  private renderSharpenedPage(): void {
    this.sharpenedLayer?.destroy(true);
    const items: Phaser.GameObjects.GameObject[] = [];

    const x = SCREEN_PAD + 372;
    const y = 80;
    const w = CANVAS.width - x - SCREEN_PAD;
    const h = CANVAS.height - y - 120;
    const perPage = Math.max(1, Math.floor((h - 158) / 52) + 1);
    const pages = Math.max(1, Math.ceil(this.sharpenedSkills.length / perPage));
    this.sharpenedPage = Math.min(this.sharpenedPage, pages - 1);
    const start = this.sharpenedPage * perPage;
    const slice = this.sharpenedSkills.slice(start, start + perPage);

    slice.forEach((skill, i) => {
      const ry = y + 48 + i * 52;
      const registry = gameState.skill(skill);

      // Bounded at the status pill rather than left to run. The longest skill
      // name in the registry is 55 characters, which lands about 37 px short of
      // the pill: it fits today by a margin too thin to rely on.
      const name = this.add.text(x + 16, ry, registry.name, {
        ...TEXT.body, wordWrap: { width: w - 32 - 300 - 16 },
      });
      const code = capsLabel(this, x + 16, ry + 22, `${skill} · ${registry.standards.join(" · ")}`, C.textMuted, TRACK.readout);
      items.push(name, code);

      const pill = statusPill(this, x + w - 16 - 300, ry, gameState.statusOf(skill));
      items.push(pill);

      if (hasPage(skill)) {
        const review = button(this, {
          x: x + w - 16 - 120,
          y: ry - 2,
          width: 120,
          label: "REVIEW",
          variant: "secondary",
          onClick: () => this.openManual(skill),
        });
        items.push(review.container);
      }
    });

    if (pages > 1) {
      const rowY = y + h - 50;
      const label = capsLabel(this, x + 16, rowY + 14, `${start + 1}-${start + slice.length} OF ${this.sharpenedSkills.length}`, C.textMuted, TRACK.readout);
      const next = button(this, {
        x: x + w - 16 - 80, y: rowY, width: 80, height: HIT.min,
        label: "NEXT", variant: "ghost",
        onClick: () => { if (this.sharpenedPage < pages - 1) { this.sharpenedPage += 1; this.renderSharpenedPage(); } },
      });
      const prev = button(this, {
        x: x + w - 16 - 80 - 90, y: rowY, width: 80, height: HIT.min,
        label: "PREV", variant: "ghost",
        onClick: () => { if (this.sharpenedPage > 0) { this.sharpenedPage -= 1; this.renderSharpenedPage(); } },
      });
      items.push(label, next.container, prev.container);
    }

    this.sharpenedLayer = this.add.container(0, 0, items);
  }

  private openManual(skill: string): void {
    if (this.manual) return;
    this.manual = new ManualPanel({
      scene: this,
      skill,
      tier: gameState.tierOf(skill),
      status: gameState.statusOf(skill),
      costNote: "PRACTICE DOESN'T COUNT FOR OR AGAINST YOU",
      onClose: () => { this.manual = undefined; },
    });
  }

  /** After a sortie the obvious next click is the sortie after it. */
  private nextMissionId(): string {
    const all = findMission(this.debrief.missionId);
    const flown = gameState.file.missionsFlown;
    const next = all.n + 1;
    const candidate = `${all.unitId}-${String(next).padStart(2, "0")}`;
    try {
      findMission(candidate);
      return flown.includes(this.debrief.missionId) ? candidate : this.debrief.missionId;
    } catch {
      return this.debrief.missionId;
    }
  }

  /**
   * A boss sortie that was flown to the end earns its airframe. "Flown to the
   * end" is the bar: the design says failure keeps every bit of progress, so
   * running out of fuel is not a pass, and nothing else in the rulebook sets a
   * score to beat.
   */
  private settleBoss(): string | null {
    const m = findMission(this.debrief.missionId);
    if (m.kind !== "boss" || this.debrief.failed) return null;

    let file = passBoss(gameState.file, m.unitId);
    const earns = BOSS_UNLOCKS[m.unitId];
    let unlocked: string | null = null;
    if (earns && !file.unlockedAirframes.includes(earns)) {
      file = unlockAirframe(file, earns);
      unlocked = earns;
    }

    // The Blackbird is not a boss drop. It arrives when the whole year is
    // ONLINE, which can only ever happen on the last boss of the last chapter.
    if (!file.unlockedAirframes.includes(CAPSTONE_AIRFRAME) && gameState.allOnline(file)) {
      file = unlockAirframe(file, CAPSTONE_AIRFRAME);
      unlocked = CAPSTONE_AIRFRAME;
    }

    gameState.update(file);
    return unlocked;
  }

  private actions(): void {
    const y = CANVAS.height - 92;
    button(this, {
      x: SCREEN_PAD,
      y,
      width: 220,
      height: HIT.lg,
      label: "FLY AGAIN",
      variant: "primary",
      onClick: () => this.scene.start("Briefing", { unitId: this.debrief.unitId, missionId: this.nextMissionId() }),
    });
    button(this, {
      x: SCREEN_PAD + 240,
      y,
      width: 220,
      height: HIT.lg,
      label: "CAMPAIGN",
      variant: "secondary",
      onClick: () => this.scene.start("Campaign", { unitId: this.debrief.unitId }),
    });
    button(this, {
      x: SCREEN_PAD + 480,
      y,
      width: 200,
      height: HIT.lg,
      label: "DOSSIER",
      variant: "ghost",
      onClick: () => this.scene.start("Dossier"),
    });

    // The reveal is a screen of its own, and it is the first thing the player
    // should see after a boss. It goes last so the debrief is already built
    // underneath when they come back from it.
    if (this.unlocked) {
      const airframe = this.unlocked;
      this.time.delayedCall(700, () => this.scene.start("Unlock", { airframe, unitId: this.debrief.unitId }));
    }
  }
}
