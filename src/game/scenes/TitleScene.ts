// 01 Title / attract.

import Phaser from "phaser";
import { C, N, TEXT, CANVAS, SCREEN_PAD, hex, STROKE } from "../../ui/tokens";
import { button, capsLabel } from "../ui/kit";
import { showCallsignPrompt } from "../ui/callsignPrompt";
import { gameState } from "../state";
import { music } from "../music";

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

    // A first-time pilot goes to Flight School; after that, straight to the hangar.
    const first = !gameState.file.flightSchoolDone;
    const go = (): void => { this.scene.start(first ? "FlightSchool" : "Hangar"); };

    button(this, {
      x: SCREEN_PAD + 28,
      y: 430,
      width: 260,
      height: 56,
      label: first ? "START FLIGHT SCHOOL" : "ENTER HANGAR",
      variant: "primary",
      onClick: go,
    });

    if (first) {
      button(this, {
        x: SCREEN_PAD + 28,
        y: 430 + 56 + 12,
        width: 260,
        label: "SKIP TO HANGAR",
        variant: "ghost",
        onClick: () => this.scene.start("Hangar"),
      });
    }

    const hint = capsLabel(this, SCREEN_PAD + 28, CANVAS.height - 52, "ENTER · START", C.textMuted);
    void hint;

    this.soundPrompt();

    // A pilot still flying under the default name is asked to name themselves
    // before the title's doors open. LATER dismisses it for this launch only,
    // so the prompt returns next time; a committed name restarts the screen.
    const prompt = showCallsignPrompt(this, {
      onClose: (confirmed) => {
        if (confirmed) { this.scene.restart(); return; }
        this.input.keyboard?.once("keydown-ENTER", go);
      },
    });
    if (!prompt) this.input.keyboard?.once("keydown-ENTER", go);
  }

  /**
   * Ask for the click that lets the music start.
   *
   * A browser will not play audio until the page has been touched, and the only
   * things to touch on this screen are buttons that leave it. So the one click a
   * pilot makes here both unblocks the theme and ends the screen it plays on: he
   * never heard it. This gives him somewhere to click that is not a door.
   *
   * It only appears when the music really is being held, so a return visit —
   * where the browser already trusts the page — shows nothing.
   */
  private soundPrompt(): void {
    if (music.isPlaying()) return;

    const label = capsLabel(this, SCREEN_PAD + 28, CANVAS.height - 80, "♪  CLICK ANYWHERE FOR SOUND", C.lock);
    this.tweens.add({
      targets: label, alpha: 0.35, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });

    // Anywhere, including the buttons: pointerdown lands before the button's
    // pointerup, so pressing ENTER HANGAR still starts the music on the way out.
    const wake = (): void => {
      music.resume();
      this.tweens.killTweensOf(label);
      label.destroy();
    };
    this.input.once("pointerdown", wake);
    this.input.keyboard?.once("keydown", wake);
  }
}
