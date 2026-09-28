// M3 Manual library: one status tile per skill with a Flight Manual page.

import Phaser from "phaser";
import { C, N, SIZE, TEXT, TRACK, CANVAS, SCREEN_PAD, STROKE, hex } from "../../ui/tokens";
import { panel, capsLabel, button, statusPill } from "../ui/kit";
import { ManualPanel } from "../ui/manualPanel";
import { availablePages } from "../manual";
import { gameState } from "../state";

export class ManualLibraryScene extends Phaser.Scene {
  private manual?: ManualPanel;

  constructor() {
    super("Manual");
  }

  create(): void {
    this.cameras.main.setBackgroundColor(N.ground);

    const title = this.add.text(SCREEN_PAD, 14, "FLIGHT MANUAL", { ...TEXT.h3 });
    title.setLetterSpacing(TRACK.display * SIZE.h3);
    const note = capsLabel(this, SCREEN_PAD + 260, 22, "PRACTICE NEVER COUNTS FOR OR AGAINST YOU", C.hud, TRACK.readout);
    void note;

    const rule = this.add.graphics();
    rule.lineStyle(STROKE.hairline, hex(C.border), 1);
    rule.lineBetween(SCREEN_PAD, 58, CANVAS.width - SCREEN_PAD, 58);

    const pages = availablePages();
    const cols = 3;
    const tileW = (CANVAS.width - SCREEN_PAD * 2 - 16 * (cols - 1)) / cols;
    const tileH = 130;

    pages.forEach((skill, i) => {
      const x = SCREEN_PAD + (i % cols) * (tileW + 16);
      const y = 80 + Math.floor(i / cols) * (tileH + 16);
      const registry = gameState.skill(skill);

      panel(this, x, y, tileW, tileH, { fill: C.panelRaised });
      const code = capsLabel(this, x + 14, y + 14, skill, C.lock, TRACK.readout);
      void code;
      const name = this.add.text(x + 14, y + 36, registry.name, {
        ...TEXT.body, wordWrap: { width: tileW - 28 },
      });
      void name;
      const pill = statusPill(this, x + 14, y + tileH - 76, gameState.statusOf(skill));
      void pill;

      button(this, {
        x: x + 14,
        y: y + tileH - 58,
        width: tileW - 28,
        label: "OPEN",
        variant: "secondary",
        onClick: () => this.open(skill),
      });
    });

    button(this, {
      x: SCREEN_PAD,
      y: CANVAS.height - 68,
      width: 200,
      label: "BACK",
      variant: "ghost",
      onClick: () => this.scene.start("Hangar"),
    });
  }

  private open(skill: string): void {
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
}
