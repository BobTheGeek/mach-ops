// Math Kit renderers for the figures Chapter 1 actually uses: MK-1 number lines
// (horizontal and vertical, plus zero pairs) and MK-3 tables.
//
// docs/design.md section 6: series A is ice blue solid/filled, series B amber
// dashed/hollow, green only for the answer, grid #152131, axes #8BA0B8,
// labels 14 px mono. Figures are drawn from the FigureSpec data the generator
// produced; generators never draw.

import Phaser from "phaser";
import { C, N, SIZE, FONT, STROKE, hex, tokens } from "../../ui/tokens";
import type { FigureSpec } from "../../engine/types";
import { mathKitFor } from "../../engine/mathkit";
import { MINUS } from "../../engine/rational";

const SERIES_A = tokens.color.mathKit.seriesA;
const SERIES_B = tokens.color.mathKit.seriesB;

/** The manual's diagram slot is 180 px tall (DESIGN_RECONCILIATION section 6). */
export const SLOT_H = 180;

function tick(v: number): string {
  return v < 0 ? `${MINUS}${Math.abs(v)}` : String(v);
}

/** Round a span out to a readable step so the line never grows a forest of ticks. */
function stepFor(min: number, max: number): number {
  const span = Math.max(1, max - min);
  const raw = span / 10;
  for (const s of [1, 2, 5, 10, 20, 25, 50, 100, 250, 500, 1000]) if (raw <= s) return s;
  return 1000;
}

function numberLine(
  scene: Phaser.Scene,
  spec: FigureSpec,
  w: number,
  h: number,
  vertical: boolean,
): Phaser.GameObjects.Container {
  const min = spec.min ?? -10;
  const max = spec.max ?? 10;
  const points = spec.points ?? [];
  const objects: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics();
  objects.push(g);

  const pad = 24;
  const length = (vertical ? h : w) - pad * 2;
  const axis = vertical ? w / 2 : h / 2;
  const at = (v: number): number => pad + ((v - min) / (max - min || 1)) * length;

  // axis
  g.lineStyle(STROKE.hud, hex(C.textMuted), 1);
  if (vertical) g.lineBetween(axis, pad, axis, pad + length);
  else g.lineBetween(pad, axis, pad + length, axis);

  // ticks and labels
  const step = stepFor(min, max);
  const first = Math.ceil(min / step) * step;
  for (let v = first; v <= max; v += step) {
    const p = at(v);
    const isZero = v === 0;
    g.lineStyle(STROKE.hairline, hex(isZero ? C.textMuted : C.gridLine), 1);
    if (vertical) g.lineBetween(axis - 6, p, axis + 6, p);
    else g.lineBetween(p, axis - 6, p, axis + 6);

    const t = scene.add.text(0, 0, tick(v), {
      fontFamily: FONT.mono,
      fontSize: `${SIZE.label}px`,
      color: isZero ? C.text : C.textMuted,
    });
    if (vertical) t.setPosition(axis + 12, p - t.height / 2);
    else t.setPosition(p - t.width / 2, axis + 10);
    objects.push(t);
  }

  // the drawn values: series A ice blue filled, series B amber hollow
  points.forEach((v, i) => {
    const p = at(v);
    const seriesA = i === 0;
    const color = hex(seriesA ? SERIES_A : SERIES_B);
    g.lineStyle(STROKE.hud, color, 1);
    if (seriesA) {
      g.fillStyle(color, 1);
      if (vertical) g.fillCircle(axis, p, 6);
      else g.fillCircle(p, axis, 6);
    } else if (vertical) g.strokeCircle(axis, p, 6);
    else g.strokeCircle(p, axis, 6);
  });

  return scene.add.container(0, 0, objects);
}

function zeroPairs(scene: Phaser.Scene, spec: FigureSpec, w: number, h: number): Phaser.GameObjects.Container {
  // Counters: a positive chip and a negative chip cancel. Shape, not colour, carries it.
  const labels = (spec.labels ?? []).map(Number).filter((n) => Number.isFinite(n));
  const objects: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics();
  objects.push(g);

  const r = 9;
  const gap = 6;
  let x = 16;
  let y = 20;
  for (const n of labels) {
    const positive = n >= 0;
    for (let i = 0; i < Math.min(Math.abs(n), 12); i++) {
      if (x + r * 2 > w - 16) { x = 16; y += r * 2 + gap; }
      if (y > h - r) break;
      if (positive) {
        g.fillStyle(hex(SERIES_A), 1);
        g.fillCircle(x + r, y, r);
      } else {
        g.lineStyle(STROKE.hud, hex(SERIES_B), 1);
        g.strokeCircle(x + r, y, r);
      }
      x += r * 2 + gap;
    }
    x = 16;
    y += r * 2 + gap + 4;
  }
  return scene.add.container(0, 0, objects);
}

function table(scene: Phaser.Scene, spec: FigureSpec, w: number, _h: number): Phaser.GameObjects.Container {
  const rows = spec.rows ?? [];
  const objects: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics();
  objects.push(g);

  const rowH = 28;
  rows.forEach((row, i) => {
    const y = 8 + i * rowH;
    g.fillStyle(N.panelRaised, i === 0 ? 1 : 0);
    g.fillRect(8, y, w - 16, rowH);
    g.lineStyle(STROKE.hairline, hex(C.border), 1);
    g.strokeRect(8, y, w - 16, rowH);
    row.forEach((cell, j) => {
      const t = scene.add.text(16 + j * ((w - 32) / Math.max(1, row.length)), y + 6, String(cell), {
        fontFamily: FONT.mono,
        fontSize: `${SIZE.label}px`,
        color: C.text,
      });
      objects.push(t);
    });
  });
  return scene.add.container(0, 0, objects);
}

/**
 * Draw a figure into a w x h slot. Returns null when the figure has no renderer
 * yet, so the card simply leaves the slot out rather than showing a broken box.
 */
export function renderFigure(
  scene: Phaser.Scene,
  spec: FigureSpec | undefined,
  w: number,
  h: number,
): Phaser.GameObjects.Container | null {
  if (!spec) return null;
  switch (spec.kind) {
    case "number-line":
      return numberLine(scene, spec, w, h, false);
    case "vertical-number-line":
      return numberLine(scene, spec, w, h, true);
    case "zero-pairs":
      return zeroPairs(scene, spec, w, h);
    case "debt-table":
    case "table":
    case "two-way-table":
      return table(scene, spec, w, h);
    default:
      return null;
  }
}

/** Which Math Kit component a figure belongs to, for debugging and the /dad view. */
export const figureComponent = (spec: FigureSpec | undefined): string | null =>
  spec ? mathKitFor(spec.kind) : null;
