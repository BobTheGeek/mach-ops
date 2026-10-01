// Chapter mission list, opened from a hangar chapter card. Ten sorties for
// Chapter 1: five that each lean on one skill, three mixed, a shakedown, then
// the unit boss (Screens 11: amber frame, higher stakes).

import Phaser from "phaser";
import { C, N, SIZE, TEXT, TRACK, CANVAS, SCREEN_PAD, STROKE, hex } from "../../ui/tokens";
import { panel, capsLabel, button } from "../ui/kit";
import { fitLine, type DetailPart } from "../ui/fitLine";
import { gameState } from "../state";
import { estimatedSortieMs, estimateMinutes, paceMs } from "../../engine/pacing";
import { missionsFor, type Mission } from "../../data/campaign";

export class CampaignScene extends Phaser.Scene {
  private unitId = "ch1";
  /** the pilot's median answer pace, so every card estimates the same way */
  private pace = 0;

  constructor() {
    super("Campaign");
  }

  init(data: { unitId?: string }): void {
    this.unitId = data.unitId ?? "ch1";
  }

  create(): void {
    this.cameras.main.setBackgroundColor(N.ground);
    this.pace = paceMs(gameState.file.log);
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
      this.missionCard(x, y, w, h, m);
    });
  }

  private missionCard(x: number, y: number, w: number, h: number, m: Mission): void {
    // Every sortie is open from the first launch (2026-09-30 unlock ruling);
    // the only progression left in this scene is the record on each card.
    const flown = gameState.file.missionsFlown.includes(m.id);
    const boss = m.kind === "boss";

    panel(this, x, y, w, h, {
      fill: C.panelRaised,
      border: boss ? C.lock : C.border,
    });

    const ctaW = 120;

    // Header row: sortie number left, its shape right, clear of the CTA. The
    // brief then owns the rest of the card instead of fighting a footer row.
    const num = capsLabel(this, x + 14, y + 12, `SORTIE ${String(m.n).padStart(2, "0")}`,
      boss ? C.lock : C.hud, TRACK.readout);

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
    // Expected time from the pilot's own pace, so a long capstone is not a
    // surprise at the briefing. It sits with the problem count, which is what
    // it is derived from.
    const eta = `~${estimateMinutes(estimatedSortieMs(m.problems, this.pace))} MIN`;
    // A single label with no word wrap, so it is fitted to the room between the
    // sortie number and the CTA. Segments give way in value order: prep, then
    // the focus list, the ETA, the problem count and finally the flown score —
    // which outranks the problem count, because "what to beat" is the more
    // useful line once a card has been flown. The kind label stays. See fitLine.
    const detailParts: DetailPart[] = [
      { text: kindLabel, priority: 60 },
      { text: focus, priority: 20 },
      { text: `${m.problems} PROBLEMS`, priority: 40 },
      { text: eta, priority: 30 },
      { text: `${m.prep} PREP`, priority: 10 },
      { text: flown ? flownLabel : "", priority: 50 },
    ].filter((p) => p.text !== "");
    const detailX = num.x + num.width + 16;
    const room = Math.floor(x + w - 14 - ctaW - 16 - detailX);
    const probe = this.add.text(0, 0, "", { ...TEXT.label }).setVisible(false);
    probe.setLetterSpacing(TRACK.readout * SIZE.label);
    const detail = capsLabel(this, detailX, y + 12,
      fitLine(detailParts, room, (s) => { probe.setText(s); return probe.width; }),
      boss ? C.lock : C.textMuted, TRACK.readout);
    probe.destroy();
    void detail;

    const name = this.add.text(x + 14, y + 12 + SIZE.label + 6, m.name, {
      ...TEXT.h3, fontSize: "18px", color: C.text,
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
      label: flown ? "FLY AGAIN" : "BRIEF",
      variant: boss ? "secondary" : "primary",
      onClick: () => {
        this.scene.start("Briefing", { unitId: this.unitId, missionId: m.id });
      },
    });
  }
}
