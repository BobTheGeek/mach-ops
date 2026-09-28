// 01 Title / attract.

import Phaser from "phaser";
import { C, N, TEXT, CANVAS, SCREEN_PAD, hex, STROKE } from "../../ui/tokens";
import { button, capsLabel } from "../ui/kit";
import { gameState } from "../state";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("Title");
  }

  create(): void {
    this.cameras.main.setBackgroundColor(N.ground);

    // faint sea grid, so the title already reads as avionics
    const g = this.add.graphics();
    g.lineStyle(STROKE.hairline, hex(C.gridLine), 1);
    for (let x = 0; x <= CANVAS.width; x += 64) g.lineBetween(x, 0, x, CANVAS.height);
    for (let y = 0; y <= CANVAS.height; y += 64) g.lineBetween(0, y, CANVAS.width, y);

    const wordmark = this.add.text(SCREEN_PAD + 24, 180, "MACH OPS", { ...TEXT.wordmark });
    wordmark.setLetterSpacing(0.02 * 72);

    const sub = this.add.text(SCREEN_PAD + 28, 268, "WEAPONS-GRADE MATH", { ...TEXT.h2, color: C.hud });
    sub.setLetterSpacing(0.02 * 32);

    const line = this.add.graphics();
    line.lineStyle(STROKE.hud, hex(C.lock), 1);
    line.lineBetween(SCREEN_PAD + 28, 320, SCREEN_PAD + 28 + 200, 320);

    const pilot = capsLabel(this, SCREEN_PAD + 28, 344, `PILOT ${gameState.file.callsign}`, C.textMuted);
    const credits = capsLabel(this, SCREEN_PAD + 28, 366, `${gameState.file.credits} CR · STREAK ${gameState.file.streak}`, C.textMuted);
    void pilot;
    void credits;

    if (this.textures.exists("t38-side")) {
      this.add.image(CANVAS.width - 380, 400, "t38-side").setDisplaySize(640, 237).setAlpha(0.9);
    }

    button(this, {
      x: SCREEN_PAD + 28,
      y: 430,
      width: 260,
      height: 56,
      label: "ENTER HANGAR",
      variant: "primary",
      onClick: () => this.scene.start("Hangar"),
    });

    const hint = capsLabel(this, SCREEN_PAD + 28, CANVAS.height - 52, "ENTER · START", C.textMuted);
    void hint;

    this.input.keyboard?.once("keydown-ENTER", () => this.scene.start("Hangar"));
  }
}
