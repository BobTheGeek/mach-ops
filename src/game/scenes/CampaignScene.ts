// Chapter mission list, opened from a hangar chapter card. Ten sorties for
// Chapter 1: five that each lean on one skill, three mixed, a shakedown, then
// the unit boss (Screens 11: amber frame, higher stakes).

import Phaser from "phaser";
import { C, N, SIZE, TEXT, TRACK, CANVAS, SCREEN_PAD, STROKE, hex } from "../../ui/tokens";
import { panel, capsLabel, button } from "../ui/kit";
import { gameState } from "../state";
import { missionsFor, type Mission } from "../../data/campaign";

export class CampaignScene extends Phaser.Scene {
  private unitId = "ch1";

  constructor() {
    super("Campaign");
  }

  init(data: { unitId?: string }): void {
    this.unitId = data.unitId ?? "ch1";
  }

  create(): void {
    this.cameras.main.setBackgroundColor(N.ground);
    const chapter = gameState.chapter(this.unitId);

    const title = this.add.text(SCREEN_PAD, 14, `CH ${chapter.n}`, { ...TEXT.h3 });
    title.setLetterSpacing(TRACK.display * SIZE.h3);
    const name = capsLabel(this, SCREEN_PAD + 90, 22, chapter.name, C.textMuted, TRACK.readout);
    void name;

    const flown = gameState.file.missionsFlown.filter((id) => id.startsWith(`${this.unitId}-`)).length;
    const progress = capsLabel(this, 0, 22, `${flown} OF ${missionsFor(this.unitId).length} SORTIES FLOWN`, C.hud, TRACK.readout);
    progress.setX(CANVAS.width - SCREEN_PAD - progress.width);

    const rule = this.add.graphics();
    rule.lineStyle(STROKE.hairline, hex(C.border), 1);
    rule.lineBetween(SCREEN_PAD, 58, CANVAS.width - SCREEN_PAD, 58);

    this.missionGrid();

    button(this, {
      x: SCREEN_PAD,
      y: CANVAS.height - 68,
      width: 180,
      label: "HANGAR",
      variant: "ghost",
      onClick: () => this.scene.start("Hangar"),
    });
  }

  private missionGrid(): void {
    const missions = missionsFor(this.unitId);
    const cols = 2;
    const gap = 14;
    const w = (CANVAS.width - SCREEN_PAD * 2 - gap) / cols;
    const rows = Math.ceil(missions.length / cols);
    const h = (CANVAS.height - 80 - 90 - gap * (rows - 1)) / rows;

    missions.forEach((m, i) => {
      const x = SCREEN_PAD + (i % cols) * (w + gap);
      const y = 76 + Math.floor(i / cols) * (h + gap);
      this.missionCard(x, y, w, h, m, i, missions);
    });
  }

  /** A sortie opens once the one before it has been flown; the first is always open. */
  private isOpen(index: number, all: Mission[]): boolean {
    if (index === 0) return true;
    const prev = all[index - 1]!;
    return gameState.file.missionsFlown.includes(prev.id);
  }

  private missionCard(x: number, y: number, w: number, h: number, m: Mission, i: number, all: Mission[]): void {
    const flown = gameState.file.missionsFlown.includes(m.id);
    const open = this.isOpen(i, all);
    const boss = m.kind === "boss";

    panel(this, x, y, w, h, {
      fill: C.panelRaised,
      border: boss && open ? C.lock : open ? C.border : C.gridLine,
    });

    const ctaW = 120;

    // Header row: sortie number left, its shape right, clear of the CTA. The
    // brief then owns the rest of the card instead of fighting a footer row.
    const num = capsLabel(this, x + 14, y + 12, `SORTIE ${String(m.n).padStart(2, "0")}`,
      boss ? C.lock : open ? C.hud : C.textMuted, TRACK.readout);

    // "BOSS" rides on the right-hand detail, not the left label: the left label
    // is fixed width so the two can never collide however long the detail gets.
    const focus = m.focus.length ? m.focus.join(" · ") : "MIXED REVIEW";
    const best = gameState.file.missionBests[m.id];
    // A flown sortie shows what there is to beat rather than the word FLOWN:
    // "beat your best on this sortie" is a reason to fly it again.
    const flownLabel = best
      ? `${best.grade} · ${best.firstTryHits}/${m.problems}`
      : "FLOWN";
    const kindLabel = m.capstone ? "CAPSTONE" : boss ? "BOSS" : "";
    const parts = [kindLabel, focus, `${m.problems} PROBLEMS`, `${m.prep} PREP`, flown ? flownLabel : ""]
      .filter(Boolean);
    const detail = capsLabel(this, 0, y + 12, parts.join(" · "), boss ? C.lock : C.textMuted, TRACK.readout);
    detail.setX(Math.max(num.x + num.width + 16, x + w - 14 - ctaW - 16 - detail.width));

    const name = this.add.text(x + 14, y + 12 + SIZE.label + 6, m.name, {
      ...TEXT.h3, fontSize: "18px", color: open ? C.text : C.textMuted,
    });

    const brief = this.add.text(x + 14, name.y + name.height + 4, m.brief, {
      ...TEXT.body, fontSize: "15px", color: C.textMuted,
      wordWrap: { width: w - 28 }, lineSpacing: 1,
    });
    void brief;
    button(this, {
      x: x + w - 14 - ctaW,
      y: y + 12,
      width: ctaW,
      label: flown ? "FLY AGAIN" : open ? "BRIEF" : "LOCKED",
      variant: open ? (boss ? "secondary" : "primary") : "disabled",
      onClick: () => {
        if (!open) return;
        this.scene.start("Briefing", { unitId: this.unitId, missionId: m.id });
      },
    });
  }
}
