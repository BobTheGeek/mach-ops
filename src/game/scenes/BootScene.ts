// Rasterises the SVG sprites, waits for the self-hosted fonts, then hands off to
// the title screen.

import Phaser from "phaser";
import { loadSprites, phase2Variants } from "../assets";
import { FONT, SIZE } from "../../ui/tokens";
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

  /** Every face declared in src/style.css, which is every weight the game uses. */
  private async loadFonts(): Promise<void> {
    if (!document.fonts) return;
    const faces = [
      `700 ${SIZE.wordmark}px ${FONT.display}`,
      `400 ${SIZE.body}px ${FONT.mono}`,
      `500 ${SIZE.label}px ${FONT.mono}`,
      `600 ${SIZE.number}px ${FONT.mono}`,
      `400 ${SIZE.body}px ${FONT.body}`,
      `500 ${SIZE.body}px ${FONT.body}`,
    ];
    // One missing file must not stop the game: it falls back to a system face.
    await Promise.all(faces.map((f) => document.fonts.load(f, "0123456789").catch(() => [])));
    await document.fonts.ready;
  }

  private async boot(label: Phaser.GameObjects.Text): Promise<void> {
    try {
      // Fonts first: Phaser measures text at creation, so a late-arriving face
      // would leave every label mismeasured.
      //
      // document.fonts.ready only waits for loads already in flight. A weight
      // no element has asked for yet is not in flight, so each face has to be
      // requested explicitly or the first screen that uses it measures against
      // a fallback and then reflows underneath itself.
      await this.loadFonts();
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
