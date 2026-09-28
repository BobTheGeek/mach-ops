// 13 / HP0 Pause menu. Runs as an overlay scene on top of the sortie so the
// world stays exactly where it was: "LOCK HELD · TIMER PAUSED · NO COST".

import Phaser from "phaser";
import { C, SIZE, TEXT, TRACK, CANVAS, HIT } from "../../ui/tokens";
import { panel, capsLabel, button, dim } from "../ui/kit";

export interface PauseData {
  /** shown under the title, e.g. "SORTIE 04 · 02:14" */
  subtitle: string;
  /** scene key to hand control back to */
  resumeTo: string;
  resumeData?: object;
  /** called when the player quits to the hangar; the host ends its sortie */
  onQuit?: () => void;
}

export class PauseScene extends Phaser.Scene {
  private opts!: PauseData;

  constructor() {
    super("Pause");
  }

  init(data: PauseData): void {
    this.opts = data;
  }

  create(): void {
    dim(this, 0.55);

    const w = 420;
    const h = 480;
    const x = (CANVAS.width - w) / 2;
    const y = (CANVAS.height - h) / 2;
    panel(this, x, y, w, h, { fill: C.panel });

    const title = this.add.text(x + 24, y + 24, "PAUSED", { ...TEXT.h2 });
    title.setLetterSpacing(TRACK.display * SIZE.h2);

    const sub = capsLabel(this, x + 24, y + 24 + SIZE.h2 + 8, this.opts.subtitle, C.textMuted, TRACK.readout);
    void sub;

    const rows: { label: string; key: string; variant: "primary" | "secondary" | "ghost"; go: () => void }[] = [
      { label: "RESUME", key: "ESC", variant: "primary", go: () => this.resume() },
      { label: "HOW TO PLAY", key: "?", variant: "secondary", go: () => this.open("HowToPlay") },
      { label: "FLIGHT MANUAL", key: "M", variant: "secondary", go: () => this.open("Manual") },
      { label: "SETTINGS", key: "S", variant: "secondary", go: () => this.open("Settings") },
      { label: "HANGAR · ENDS SORTIE", key: "Q", variant: "ghost", go: () => this.quit() },
    ];

    rows.forEach((row, i) => {
      const ry = y + 110 + i * (HIT.lg + 12);
      button(this, { x: x + 24, y: ry, width: w - 48, height: HIT.lg, label: row.label, variant: row.variant, onClick: row.go });
      const k = capsLabel(this, 0, ry + (HIT.lg - SIZE.label) / 2, row.key, row.variant === "primary" ? C.ground : C.textMuted, TRACK.readout);
      k.setX(x + w - 24 - 16 - k.width);
    });

    const note = capsLabel(this, x + 24, y + h - 20 - SIZE.label, "LOCK HELD · TIMER PAUSED · NO COST", C.hud, TRACK.readout);
    void note;

    this.input.keyboard?.on("keydown-ESC", () => this.resume());
    this.input.keyboard?.on("keydown-Q", () => this.quit());
    this.input.keyboard?.on("keydown-M", () => this.open("Manual"));
    this.input.keyboard?.on("keydown-S", () => this.open("Settings"));
  }

  private resume(): void {
    this.scene.stop();
    this.scene.resume(this.opts.resumeTo);
  }

  private open(key: string): void {
    this.scene.stop();
    this.scene.stop(this.opts.resumeTo);
    this.scene.start(key, { returnTo: "Hangar" });
  }

  private quit(): void {
    this.opts.onQuit?.();
    this.scene.stop();
    this.scene.stop(this.opts.resumeTo);
    this.scene.start("Hangar");
  }
}
