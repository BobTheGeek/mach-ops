// The Component Library sheet as Phaser factories.
// Every measurement comes from design/tokens.json via src/ui/tokens.ts.
//
// House rules from docs/design.md that these enforce:
//   - state is never hue alone: pills carry a glyph, inputs carry a ring + mark
//   - hit targets are at least 44 px
//   - borders are 1 px #223347, focus/state rings 2 px
//   - radius 8 on panels/inputs/buttons, 4 on badges, 999 on pills

import Phaser from "phaser";
import { C, N, TEXT, TRACK, RADIUS, STROKE, HIT, SIZE, FONT, hex } from "../../ui/tokens";
import { audio } from "../audio";
import type { SystemsStatus } from "../../engine/types";

/* ----------------------------------------------------------------- panel */

export interface PanelOpts {
  fill?: string;
  border?: string;
  radius?: number;
  borderWidth?: number;
}

export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  o: PanelOpts = {},
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(hex(o.fill ?? C.panel), 1);
  g.fillRoundedRect(x, y, w, h, o.radius ?? RADIUS.panel);
  g.lineStyle(o.borderWidth ?? STROKE.hairline, hex(o.border ?? C.border), 1);
  g.strokeRoundedRect(x, y, w, h, o.radius ?? RADIUS.panel);
  return g;
}

/* ------------------------------------------------------------------ text */

/** 14 px mono caps with the token tracking. Used for every label and readout. */
export function capsLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color: string = C.textMuted,
  track: number = TRACK.label,
): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, text.toUpperCase(), { ...TEXT.label, color });
  t.setLetterSpacing(track * SIZE.label);
  return t;
}

export function value(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color: string = C.text,
  size: number = SIZE.number,
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, { fontFamily: FONT.mono, fontSize: `${size}px`, color, fontStyle: "600" });
}

/** A label above its value, the readout block used all over the HUD. */
export function readout(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  initial: string,
  color: string = C.text,
): { label: Phaser.GameObjects.Text; value: Phaser.GameObjects.Text; set(v: string): void } {
  const l = capsLabel(scene, x, y, label, C.textMuted, TRACK.readout);
  const v = value(scene, x, y + SIZE.label + 4, initial, color);
  return { label: l, value: v, set: (s: string) => v.setText(s) };
}

/* --------------------------------------------------------------- buttons */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "disabled";

export interface ButtonOpts {
  x: number;
  y: number;
  width: number;
  label: string;
  variant?: ButtonVariant;
  /** 44 default, 56 for launch / commit */
  height?: number;
  onClick?: () => void;
}

export interface Button {
  container: Phaser.GameObjects.Container;
  setVariant(v: ButtonVariant): void;
  setLabel(s: string): void;
  destroy(): void;
}

export function button(scene: Phaser.Scene, o: ButtonOpts): Button {
  const h = Math.max(o.height ?? HIT.min, HIT.min);
  const w = o.width;
  let variant: ButtonVariant = o.variant ?? "primary";

  const g = scene.add.graphics();
  const label = scene.add.text(0, 0, o.label.toUpperCase(), {
    fontFamily: FONT.mono,
    fontSize: `${SIZE.label}px`,
    color: C.ground,
    fontStyle: "600",
  });
  label.setLetterSpacing(TRACK.readout * SIZE.label);

  const draw = (): void => {
    g.clear();
    if (variant === "primary") {
      g.fillStyle(N.hud, 1);
      g.fillRoundedRect(0, 0, w, h, RADIUS.input);
      label.setColor(C.ground);
    } else {
      const line = variant === "secondary" ? C.hud : C.border;
      g.lineStyle(STROKE.hairline, hex(line), 1);
      g.strokeRoundedRect(0, 0, w, h, RADIUS.input);
      label.setColor(variant === "disabled" ? C.border : variant === "secondary" ? C.hud : C.textMuted);
    }
    label.setPosition((w - label.width) / 2, (h - label.height) / 2);
  };
  draw();

  // Input rides on a Zone rather than the Container: a zone's hit area is its own
  // rectangle in world space, which resolves reliably regardless of how the
  // container's children are laid out.
  const zone = scene.add.zone(0, 0, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
  zone.on("pointerup", () => {
    if (variant === "disabled") return;
    audio.play("uiConfirm");
    o.onClick?.();
  });
  zone.on("pointerover", () => {
    if (variant !== "disabled") audio.play("uiMove");
  });

  const container = scene.add.container(o.x, o.y, [g, label, zone]);
  container.setSize(w, h);

  return {
    container,
    setVariant(v) { variant = v; draw(); zone.input!.cursor = v === "disabled" ? "default" : "pointer"; },
    setLabel(s) { label.setText(s.toUpperCase()); draw(); },
    destroy() { container.destroy(); },
  };
}

/* ----------------------------------------------------------- status pill */

/** Glyph + word, never colour alone (docs/design.md principle 3). */
const PILL: Record<SystemsStatus, { glyph: string; color: string; filled: boolean }> = {
  OFFLINE: { glyph: "○", color: C.textMuted, filled: false },
  CALIBRATING: { glyph: "◆", color: C.lock, filled: true },
  ONLINE: { glyph: "●", color: C.hud, filled: true },
  OPTIMIZED: { glyph: "■", color: C.hud, filled: true },
};

export function statusPill(
  scene: Phaser.Scene,
  x: number,
  y: number,
  status: SystemsStatus,
): Phaser.GameObjects.Container {
  const spec = PILL[status];
  const text = scene.add.text(0, 0, `${spec.glyph} ${status}`, {
    fontFamily: FONT.mono,
    fontSize: `${SIZE.label}px`,
    color: spec.color,
    fontStyle: "500",
  });
  text.setLetterSpacing(TRACK.label * SIZE.label);

  const padX = 10;
  const h = 24;
  const w = text.width + padX * 2;
  const g = scene.add.graphics();
  g.lineStyle(STROKE.hairline, hex(spec.color), 1);
  g.strokeRoundedRect(0, 0, w, h, RADIUS.pill);
  text.setPosition(padX, (h - text.height) / 2);

  return scene.add.container(x, y, [g, text]).setSize(w, h);
}

/* ------------------------------------------------------------- resource bar */

/** design/README.md: fuel and shield bars are 200 x 10 with a 1 px border. */
export const BAR_W = 200;
export const BAR_H = 10;

export interface Bar {
  container: Phaser.GameObjects.Container;
  /** 0..1 */
  set(fraction: number): void;
}

export function resourceBar(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  color: string,
): Bar {
  const l = capsLabel(scene, 0, 0, label, C.textMuted, TRACK.readout);
  const frame = scene.add.graphics();
  const fill = scene.add.graphics();
  const top = l.height + 4;

  frame.lineStyle(STROKE.hairline, hex(C.border), 1);
  frame.strokeRect(0, top, BAR_W, BAR_H);

  const set = (fraction: number): void => {
    const f = Phaser.Math.Clamp(fraction, 0, 1);
    fill.clear();
    fill.fillStyle(hex(color), 1);
    fill.fillRect(0, top, BAR_W * f, BAR_H);
  };
  set(1);

  return { container: scene.add.container(x, y, [l, fill, frame]), set };
}

/* ------------------------------------------------------------ AIM pips */

/** design/README.md: bottom-right AIM pips are 10 x 14. */
export function missilePips(
  scene: Phaser.Scene,
  x: number,
  y: number,
  total: number,
): { container: Phaser.GameObjects.Container; set(n: number): void } {
  const g = scene.add.graphics();
  const pipW = 10;
  const pipH = 14;
  const gap = 6;

  const set = (n: number): void => {
    g.clear();
    for (let i = 0; i < total; i++) {
      const px = i * (pipW + gap);
      if (i < n) {
        g.fillStyle(N.hud, 1);
        g.fillRect(px, 0, pipW, pipH);
      } else {
        g.lineStyle(STROKE.hairline, hex(C.border), 1);
        g.strokeRect(px, 0, pipW, pipH);
      }
    }
  };
  set(total);

  return { container: scene.add.container(x, y, [g]), set };
}

/* ------------------------------------------------------------- dim layer */

/** The rgba(10,16,24,0.55) scrim modal cards sit on. */
export function dim(scene: Phaser.Scene, alpha = 0.55): Phaser.GameObjects.Rectangle {
  const { width, height } = scene.scale;
  return scene.add
    .rectangle(0, 0, width, height, N.ground, alpha)
    .setOrigin(0, 0)
    .setInteractive(); // swallow clicks on the world behind
}
