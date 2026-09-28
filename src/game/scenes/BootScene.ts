// Rasterises the SVG sprites, waits for the self-hosted fonts, then hands off to
// the title screen.

import Phaser from "phaser";
import { loadSprites, phase2Variants } from "../assets";
import { C, N, TEXT, CANVAS } from "../../ui/tokens";
import { capsLabel } from "../ui/kit";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create(): void {
    this.cameras.main.setBackgroundColor(N.ground);
    const label = capsLabel(this, 0, 0, "LOADING", C.textMuted);
    label.setPosition((CANVAS.width - label.width) / 2, CANVAS.height / 2 - 10);

    void this.boot(label);
  }

  private async boot(label: Phaser.GameObjects.Text): Promise<void> {
    try {
      // Fonts first: Phaser measures text at creation, so a late-arriving face
      // would leave every label mismeasured.
      if (document.fonts?.ready) await document.fonts.ready;
      await loadSprites(this, phase2Variants("t38"));
      this.scene.start("Title");
    } catch (err) {
      label.setText("");
      this.add.text(CANVAS.width / 2 - 260, CANVAS.height / 2 - 20, `Could not load sprites.\n${String(err)}`, {
        ...TEXT.body,
        color: C.alert,
        wordWrap: { width: 520 },
      });
    }
  }
}
