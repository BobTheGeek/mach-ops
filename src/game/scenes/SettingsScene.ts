// 13B Settings, reachable from the pause menu or the hangar.
//
// Volume · answer entry (typed or on-screen keypad) · colorblind-safe HUD ·
// reduced motion · reset first-time tips · replay Flight School.

import Phaser from "phaser";
import { C, N, SIZE, TEXT, TRACK, CANVAS, SCREEN_PAD, STROKE, HIT, hex } from "../../ui/tokens";
import { panel, capsLabel, button, dim } from "../ui/kit";
import { gameState } from "../state";
import { audio } from "../audio";
import { music } from "../music";
import { clear, newSave, type Settings } from "../save";

type Toggle = { key: keyof Settings; label: string; note: string; on: string; off: string };

const TOGGLES: Toggle[] = [
  {
    key: "keypadEntry",
    label: "ANSWER ENTRY",
    note: "An on-screen keypad for touchpad-only Chromebooks.",
    on: "ON-SCREEN KEYPAD",
    off: "KEYBOARD",
  },
  {
    key: "colorblindHud",
    label: "COLORBLIND-SAFE HUD",
    note: "Adds shapes and labels to every state. The HUD already passes without it.",
    on: "SHAPES + LABELS",
    off: "DEFAULT",
  },
  {
    key: "reducedMotion",
    label: "REDUCE MOTION",
    note: "Removes the lock pulse and the hit flash. The bullet-time dim stays.",
    on: "REDUCED",
    off: "FULL",
  },
];

export class SettingsScene extends Phaser.Scene {
  private returnTo = "Hangar";
  /**
   * When opened as an overlay (from the pause menu), the scene to return to
   * instead of returnTo, and the data to reopen it with. The host stays paused
   * underneath, so this screen never ends a sortie it was opened over.
   */
  private resumeTo?: string;
  private resumeData?: object;
  /** called before navigating away for real, so a paused sortie is ended */
  private onLeave?: () => void;
  /** the erase confirmation modal's pieces, or null when it is closed */
  private eraseModal: Phaser.GameObjects.GameObject[] | null = null;
  private rows: { toggle: Toggle; label: Phaser.GameObjects.Text }[] = [];
  private volumeBar!: Phaser.GameObjects.Graphics;
  private volumeText!: Phaser.GameObjects.Text;

  constructor() {
    super("Settings");
  }

  init(data: { returnTo?: string; resumeTo?: string; resumeData?: object; onLeave?: () => void }): void {
    this.returnTo = data.returnTo ?? "Hangar";
    this.resumeTo = data.resumeTo;
    this.resumeData = data.resumeData;
    this.onLeave = data.onLeave;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(N.ground);

    const title = this.add.text(SCREEN_PAD, 14, "SETTINGS", { ...TEXT.h3 });
    title.setLetterSpacing(TRACK.display * SIZE.h3);

    const rule = this.add.graphics();
    rule.lineStyle(STROKE.hairline, hex(C.border), 1);
    rule.lineBetween(SCREEN_PAD, 58, CANVAS.width - SCREEN_PAD, 58);

    button(this, {
      x: CANVAS.width - SCREEN_PAD - HIT.min, y: 10, width: HIT.min,
      label: "✕", variant: "ghost", onClick: () => this.done(),
    });

    this.volumeRow(76);
    TOGGLES.forEach((t, i) => this.toggleRow(176 + i * 96, t));

    this.actions(CANVAS.height - 150);

    // ESC backs out of the erase confirmation first; only when nothing is
    // open does it leave the screen.
    this.input.keyboard?.on("keydown-ESC", () => {
      if (this.eraseModal) {
        audio.play("uiBack");
        this.closeEraseConfirm();
        return;
      }
      this.done();
    });
  }

  private done(): void {
    audio.play("uiBack");
    gameState.save();
    if (this.resumeTo) {
      this.scene.stop();
      this.scene.start(this.resumeTo, this.resumeData);
      return;
    }
    this.scene.start(this.returnTo);
  }

  private volumeRow(y: number): void {
    const w = CANVAS.width - SCREEN_PAD * 2;
    panel(this, SCREEN_PAD, y, w, 84, { fill: C.panelRaised });
    const label = capsLabel(this, SCREEN_PAD + 16, y + 14, "VOLUME", C.hud);
    void label;

    this.volumeBar = this.add.graphics();
    this.volumeText = this.add.text(SCREEN_PAD + 16 + 420, y + 42, "", { ...TEXT.value });

    const drawSteps = (): void => {
      const v = gameState.file.settings.volume;
      this.volumeBar.clear();
      for (let i = 0; i < 10; i++) {
        const x = SCREEN_PAD + 16 + i * 40;
        const filled = i < Math.round(v * 10);
        if (filled) {
          this.volumeBar.fillStyle(hex(C.hud), 1);
          this.volumeBar.fillRect(x, y + 44, 32, 14);
        } else {
          this.volumeBar.lineStyle(STROKE.hairline, hex(C.border), 1);
          this.volumeBar.strokeRect(x, y + 44, 32, 14);
        }
      }
      this.volumeText.setText(`${Math.round(v * 100)}%`);
    };

    // Each step is its own 44 px target rather than a slider, so a touchpad works.
    for (let i = 0; i < 10; i++) {
      const zone = this.add.zone(SCREEN_PAD + 16 + i * 40, y + 30, 40, HIT.min).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      zone.on("pointerup", () => {
        const v = (i + 1) / 10;
        gameState.update({ ...gameState.file, settings: { ...gameState.file.settings, volume: v } });
        audio.setVolume(v);
        // One slider governs everything: the synthesised cues and the theme.
        music.setVolume(v);
        audio.play("uiConfirm");
        drawSteps();
      });
    }
    drawSteps();
  }

  private toggleRow(y: number, t: Toggle): void {
    const w = CANVAS.width - SCREEN_PAD * 2;
    panel(this, SCREEN_PAD, y, w, 84, { fill: C.panelRaised });
    const label = capsLabel(this, SCREEN_PAD + 16, y + 14, t.label, C.hud);
    void label;
    const note = this.add.text(SCREEN_PAD + 16, y + 40, t.note, { ...TEXT.body, color: C.textMuted });
    void note;

    const value = this.add.text(0, 0, "", { ...TEXT.value, fontSize: "16px" });
    this.rows.push({ toggle: t, label: value });

    const draw = (): void => {
      const on = Boolean(gameState.file.settings[t.key]);
      value.setText(on ? t.on : t.off);
      value.setColor(on ? C.hud : C.textMuted);
      value.setPosition(SCREEN_PAD + w - 16 - 200 - value.width - 16, y + 30);
    };

    button(this, {
      x: SCREEN_PAD + w - 16 - 200, y: y + 20, width: 200,
      label: "TOGGLE", variant: "secondary",
      onClick: () => {
        const next = !gameState.file.settings[t.key];
        gameState.update({ ...gameState.file, settings: { ...gameState.file.settings, [t.key]: next } });
        draw();
      },
    });
    draw();
  }

  private actions(y: number): void {
    const w = 300;

    // Destructive and irreversible, so it sits on its own row above the rest
    // and only ever acts through a two-step confirmation.
    button(this, {
      x: SCREEN_PAD, y: y - HIT.lg - 12, width: w, height: HIT.lg,
      label: "ERASE PROGRESS", variant: "danger",
      onClick: () => this.eraseConfirm(1),
    });

    button(this, {
      x: SCREEN_PAD, y, width: w, height: HIT.lg,
      label: "SHOW FIRST-TIME TIPS AGAIN", variant: "ghost",
      onClick: () => {
        gameState.update({ ...gameState.file, tipsSeen: [] });
        audio.play("uiConfirm");
      },
    });
    button(this, {
      x: SCREEN_PAD + w + 16, y, width: w, height: HIT.lg,
      label: "REPLAY FLIGHT SCHOOL", variant: "ghost",
      onClick: () => {
        // Leaving for the school ends any sortie this screen was opened over,
        // rather than leaving it paused with no way back to it.
        this.onLeave?.();
        this.scene.start("FlightSchool");
      },
    });
    // The parent view is a separate plain page, not a scene: design/README.md
    // keeps it off the game skin on purpose. This is the only way in to it.
    button(this, {
      x: SCREEN_PAD + (w + 16) * 2, y, width: w, height: HIT.lg,
      label: "PARENT VIEW  \u2197", variant: "ghost",
      onClick: () => {
        audio.play("uiConfirm");
        try {
          globalThis.open("/dad.html", "_blank", "noopener,noreferrer");
        } catch {
          // A blocked popup must never take the settings screen down with it.
        }
      },
    });
    button(this, {
      x: CANVAS.width - SCREEN_PAD - 220, y, width: 220, height: HIT.lg,
      label: "DONE", variant: "primary", onClick: () => this.done(),
    });
  }

  /* ------------------------------------------------------- erase progress */

  /**
   * The two-step erase confirmation.
   *
   * Step 1 names exactly what dies; step 2 asks the really, really sure
   * question. Clicking the scrim or pressing ESC backs out at either step, so
   * nothing here can be reached by a single click.
   */
  private eraseConfirm(step: 1 | 2): void {
    this.closeEraseConfirm();

    const parts: Phaser.GameObjects.GameObject[] = [];

    const scrim = dim(this, 0.55);
    scrim.on("pointerup", () => this.closeEraseConfirm());
    parts.push(scrim);

    const w = 640;
    const h = 260;
    const x = (CANVAS.width - w) / 2;
    const y = (CANVAS.height - h) / 2;
    parts.push(panel(this, x, y, w, h, { fill: C.panel }));

    const title = this.add.text(x + 24, y + 22, step === 1 ? "ERASE ALL PROGRESS?" : "ARE YOU REALLY, REALLY SURE?", { ...TEXT.h3, color: C.alert });
    title.setLetterSpacing(TRACK.display * SIZE.h3);
    parts.push(title);

    const body = this.add.text(x + 24, y + 22 + title.height + 14, step === 1
      ? `This deletes everything for PILOT ${gameState.file.callsign}: credits, unlocked airframes, missions flown, every answer in the log, and the schedule changes made on the parent page.`
      : "All progress will be lost and the game will go back to the beginning. This cannot be undone.",
      { ...TEXT.body, color: C.text, wordWrap: { width: w - 48 }, lineSpacing: 3 });
    parts.push(body);

    const bw = 250;
    const by = y + h - 22 - HIT.lg;
    const keep = button(this, {
      x: x + 24, y: by, width: bw, height: HIT.lg,
      label: step === 1 ? "KEEP MY PROGRESS" : "CANCEL", variant: "ghost",
      onClick: () => this.closeEraseConfirm(),
    });
    const go = button(this, {
      x: x + w - 24 - bw, y: by, width: bw, height: HIT.lg,
      label: step === 1 ? "CONTINUE" : "ERASE EVERYTHING", variant: "danger",
      onClick: () => {
        if (step === 1) this.eraseConfirm(2);
        else this.eraseProgress();
      },
    });
    parts.push(keep.container, go.container);

    this.eraseModal = parts;
  }

  private closeEraseConfirm(): void {
    if (!this.eraseModal) return;
    for (const p of this.eraseModal) p.destroy();
    this.eraseModal = null;
  }

  /** Wipe the save and send the pilot back to the title, as a fresh install. */
  private eraseProgress(): void {
    this.closeEraseConfirm();
    clear();                     // drop the stored save first...
    gameState.update(newSave()); // ...then hold a fresh one in its place
    this.onLeave?.();            // a paused sortie is ended, not left running
    this.scene.start("Title");
  }
}
