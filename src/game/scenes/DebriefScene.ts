// 07 Debrief (Systems Sharpened list with Review links) and 07B (sortie ended,
// progress kept).

import Phaser from "phaser";
import { C, N, SIZE, TEXT, TRACK, CANVAS, SCREEN_PAD, STROKE, HIT, hex } from "../../ui/tokens";
import { panel, capsLabel, button, statusPill } from "../ui/kit";
import { ManualPanel } from "../ui/manualPanel";
import { gameState } from "../state";
import { hasPage } from "../manual";
import { completeSortie, passBoss, unlockAirframe } from "../save";
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
}

export class DebriefScene extends Phaser.Scene {
  private debrief!: DebriefData;
  private manual?: ManualPanel;
  private cardEarned: IntelCard | null = null;
  private unlocked: string | null = null;

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
    gameState.update(result.file);
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
    const y = 80;
    panel(this, x, y, 340, 212, { fill: C.panel });
    const h = capsLabel(this, x + 16, y + 14, "SORTIE", C.hud);
    void h;

    const rows: [string, string, string][] = [
      ["CREDITS", `${gameState.file.credits}`, C.lock],
      ["STREAK", `${gameState.file.streak} (BEST ${gameState.file.bestStreak})`, C.text],
      ["FIRST-TRY", `${this.debrief.firstTryHits} / ${this.debrief.problems}`,
        this.debrief.firstTryHits >= FIRST_TRY_HITS_FOR_CARD ? C.hud : C.textMuted],
      ["ESCAPED", `${this.debrief.escaped}`, this.debrief.escaped > 0 ? C.alert : C.textMuted],
      ["FUEL", `${Math.round(this.debrief.fuel * 100)}%`, C.hud],
      ["SHIELDS", `${Math.round(this.debrief.shields * 100)}%`, C.shield],
    ];
    rows.forEach(([label, value, color], i) => {
      const ry = y + 44 + i * 32;
      const l = capsLabel(this, x + 16, ry, label, C.textMuted, TRACK.readout);
      const v = this.add.text(x + 180, ry - 4, value, { ...TEXT.value, color });
      void l;
      void v;
    });
  }

  /** Screens 08: a sortie with 6+ first-try hits earns one intel card. */
  private intelPanel(): void {
    const x = SCREEN_PAD;
    const y = 316;
    const w = 340;
    const h = 190;
    panel(this, x, y, w, h, { fill: C.panel, border: this.cardEarned ? C.lock : C.border });

    const head = capsLabel(this, x + 16, y + 14, this.cardEarned ? "INTEL CARD EARNED" : "INTEL", C.lock);
    void head;

    if (!this.cardEarned) {
      const need = FIRST_TRY_HITS_FOR_CARD - this.debrief.firstTryHits;
      const copy = this.add.text(x + 16, y + 44,
        need > 0
          ? `${need} more first-try hit${need === 1 ? "" : "s"} in one sortie earns a card.`
          : `All ten ${fleetEntry(gameState.currentAirframe())?.designation ?? "T-38"} cards collected.`,
        { ...TEXT.body, color: C.textMuted, wordWrap: { width: w - 32 } });
      void copy;
      return;
    }

    const airframe = gameState.currentAirframe();
    const have = (gameState.file.intelCards[airframe] ?? []).length;
    const code = capsLabel(this, x + 16, y + 40, `${fleetEntry(airframe)?.designation ?? "T-38"} · ${String(this.cardEarned.n).padStart(2, "0")}   ${have} OF ${CARDS_PER_AIRFRAME}`, C.textMuted, TRACK.readout);
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

    const skills = [...new Set(this.debrief.sharpened)];
    if (skills.length === 0) {
      const none = this.add.text(x + 16, y + 52, "No systems came online this sortie. Open the Flight Manual and try again — practice never counts against you.", {
        ...TEXT.body,
        color: C.textMuted,
        wordWrap: { width: w - 32 },
      });
      void none;
      return;
    }

    skills.forEach((skill, i) => {
      const ry = y + 48 + i * 52;
      if (ry > y + h - 60) return;
      const registry = gameState.skill(skill);

      // Bounded at the status pill rather than left to run. The longest skill
      // name in the registry is 55 characters, which lands about 37 px short of
      // the pill: it fits today by a margin too thin to rely on.
      const name = this.add.text(x + 16, ry, registry.name, {
        ...TEXT.body, wordWrap: { width: w - 32 - 300 - 16 },
      });
      const code = capsLabel(this, x + 16, ry + 22, `${skill} · ${registry.standards.join(" · ")}`, C.textMuted, TRACK.readout);
      void name;
      void code;

      const pill = statusPill(this, x + w - 16 - 300, ry, gameState.statusOf(skill));
      void pill;

      if (hasPage(skill)) {
        const review = button(this, {
          x: x + w - 16 - 120,
          y: ry - 2,
          width: 120,
          label: "REVIEW",
          variant: "secondary",
          onClick: () => this.openManual(skill),
        });
        void review;
      }
    });
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
