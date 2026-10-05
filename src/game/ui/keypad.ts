// The shared on-screen answer keypad.
//
// One keypad serves every typed answer in the game: the sortie's problem card
// and Flight School's type steps both build it, so a touchpad-only Chromebook
// gets the same entry surface everywhere HP1 promised it.
//
// The keypad owns the keyTick cue: every non-commit key plays it, then reports
// the label. The check mark is the card's commit, so it never reaches onKey.

import type Phaser from "phaser";
import { C, STROKE, RADIUS, HIT, TEXT, hex } from "../../ui/tokens";
import { MINUS } from "../../engine/rational";
import { audio } from "../audio";

/** The four rows of four the card shipped: digits, fraction, sign, percent. */
export const KEYPAD_ROWS: readonly (readonly string[])[] = [
  ["1", "2", "3", "/"],
  ["4", "5", "6", MINUS],
  ["7", "8", "9", "."],
  ["\u232B", "0", "%", "\u2713"],
];

/** The pure string result of one key: backspace slices, anything else appends. */
export function applyKey(current: string, label: string): string {
  return label === "\u232B" ? current.slice(0, -1) : current + label;
}

export interface KeypadOpts {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  onKey(label: string): void;
  onCommit(): void;
}

/** Draw the keypad at x/y and report presses; also returns its height. */
export function buildKeypad(o: KeypadOpts): { container: Phaser.GameObjects.Container; height: number } {
  const s = o.scene;
  const gap = 6;
  const keyW = (o.width - gap * 3) / 4;
  const keyH = HIT.min;
  const items: Phaser.GameObjects.GameObject[] = [];

  KEYPAD_ROWS.forEach((row, r) => {
    row.forEach((label, c) => {
      const kx = o.x + c * (keyW + gap);
      const ky = o.y + r * (keyH + gap);
      const g = s.add.graphics();
      g.lineStyle(STROKE.hairline, hex(C.border), 1);
      g.strokeRoundedRect(kx, ky, keyW, keyH, RADIUS.input);
      const t = s.add.text(kx + keyW / 2, ky + keyH / 2, label, {
        ...TEXT.value, fontSize: "18px",
      }).setOrigin(0.5, 0.5);
      const zone = s.add.zone(kx, ky, keyW, keyH).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      zone.on("pointerup", () => {
        if (label === "\u2713") { o.onCommit(); return; }
        audio.play("keyTick");
        o.onKey(label);
      });
      items.push(g, t, zone);
    });
  });

  return {
    container: s.add.container(0, 0, items),
    height: KEYPAD_ROWS.length * keyH + (KEYPAD_ROWS.length - 1) * gap,
  };
}
