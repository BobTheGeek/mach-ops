// 07 Debrief (Systems Sharpened list with Review links) and 07B (sortie ended,
// progress kept).

import Phaser from "phaser";
import { C, N, SIZE, TEXT, TRACK, CANVAS, SCREEN_PAD, STROKE, HIT, hex } from "../../ui/tokens";
import { panel, capsLabel, button, statusPill } from "../ui/kit";
import { ManualPanel } from "../ui/manualPanel";
import { gameState } from "../state";
import { hasPage } from "../manual";

export interface DebriefData {
  unitId: string;
  reason: string;
  sharpened: string[];
  fuel: number;
  shields: number;
  failed: boolean;
}

export class DebriefScene extends Phaser.Scene {
  private debrief!: DebriefData;
  private manual?: ManualPanel;

  constructor() {
    super("Debrief");
  }

  init(data: DebriefData): void {
    this.debrief = data;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(N.ground);

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
    this.systemsSharpened();
    this.actions();
  }

  private summary(): void {
    const x = SCREEN_PAD;
    const y = 80;
    panel(this, x, y, 340, 180, { fill: C.panel });
    const h = capsLabel(this, x + 16, y + 14, "SORTIE", C.hud);
    void h;

    const rows: [string, string, string][] = [
      ["CREDITS", `${gameState.file.credits}`, C.lock],
      ["STREAK", `${gameState.file.streak} (BEST ${gameState.file.bestStreak})`, C.text],
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

      const name = this.add.text(x + 16, ry, registry.name, { ...TEXT.body });
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

  private actions(): void {
    const y = CANVAS.height - 92;
    button(this, {
      x: SCREEN_PAD,
      y,
      width: 220,
      height: HIT.lg,
      label: "FLY AGAIN",
      variant: "primary",
      onClick: () => this.scene.start("Briefing", { unitId: this.debrief.unitId }),
    });
    button(this, {
      x: SCREEN_PAD + 240,
      y,
      width: 220,
      height: HIT.lg,
      label: "HANGAR",
      variant: "secondary",
      onClick: () => this.scene.start("Hangar"),
    });
  }
}
