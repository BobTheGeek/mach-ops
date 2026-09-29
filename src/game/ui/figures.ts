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
  const style = { fontFamily: FONT.mono, fontSize: `${SIZE.label}px`, color: C.text };

  // The first cell of each row is its name — MISSILES, SORTIES, FUEL (L) — and
  // it is always longer than the numbers beside it. Splitting the width evenly
  // ran the name straight over the first value, so the name column is measured
  // and the data columns share what is left.
  const measured = rows.map((row) => row.map((cell) => {
    const t = scene.add.text(0, 0, String(cell), style);
    objects.push(t);
    return t;
  }));
  const labelW = Math.min(
    w * 0.45,
    Math.max(0, ...measured.map((cells) => (cells[0]?.width ?? 0))) + 14,
  );
  const cols = Math.max(1, ...rows.map((r) => r.length));
  const dataW = cols > 1 ? (w - 32 - labelW) / (cols - 1) : 0;

  measured.forEach((cells, i) => {
    const y = 8 + i * rowH;
    g.fillStyle(N.panelRaised, i === 0 ? 1 : 0);
    g.fillRect(8, y, w - 16, rowH);
    g.lineStyle(STROKE.hairline, hex(C.border), 1);
    g.strokeRect(8, y, w - 16, rowH);
    cells.forEach((t, j) => t.setPosition(16 + (j === 0 ? 0 : labelW + (j - 1) * dataW), y + 6));
  });
  return scene.add.container(0, 0, objects);
}

/**
 * MK-2 coordinate plane. Proportional relationships live or die on whether the
 * line goes through the origin, so the origin is always drawn and always labelled.
 */
function coordinatePlane(
  scene: Phaser.Scene,
  spec: FigureSpec,
  w: number,
  h: number,
): Phaser.GameObjects.Container {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics();
  objects.push(g);

  const pad = 26;
  const maxX = spec.max ?? 10;
  const maxY = (spec.maxY as number | undefined) ?? maxX;
  const plotW = w - pad * 2;
  const plotH = h - pad * 2;
  const px = (x: number): number => pad + (x / (maxX || 1)) * plotW;
  const py = (y: number): number => h - pad - (y / (maxY || 1)) * plotH;

  // grid
  g.lineStyle(STROKE.hairline, hex(C.gridLine), 1);
  const step = Math.max(1, Math.round(maxX / 5));
  for (let x = 0; x <= maxX; x += step) g.lineBetween(px(x), py(0), px(x), py(maxY));
  for (let y = 0; y <= maxY; y += Math.max(1, Math.round(maxY / 5))) g.lineBetween(px(0), py(y), px(maxX), py(y));

  // axes
  g.lineStyle(STROKE.hud, hex(C.textMuted), 1);
  g.lineBetween(px(0), py(0), px(maxX), py(0));
  g.lineBetween(px(0), py(0), px(0), py(maxY));

  const origin = scene.add.text(px(0) - 12, py(0) + 4, "0", {
    fontFamily: FONT.mono, fontSize: `${SIZE.label}px`, color: C.textMuted,
  });
  objects.push(origin);

  // Each series is a list of [x, y] pairs; A is ice blue solid, B amber dashed.
  const series = (spec.series as number[][][] | undefined) ?? [];
  // When a card asks the player to choose between lines, the lines need names.
  const seriesLabels = (spec.seriesLabels as string[] | undefined) ?? [];
  series.forEach((points, i) => {
    const colour = hex(i === 0 ? SERIES_A : SERIES_B);
    g.lineStyle(STROKE.hud, colour, 1);
    points.forEach((pt, j) => {
      const [x, y] = pt as [number, number];
      if (j > 0) {
        const [prevX, prevY] = points[j - 1] as [number, number];
        g.lineBetween(px(prevX), py(prevY), px(x), py(y));
      }
    });
    for (const pt of points) {
      const [x, y] = pt as [number, number];
      if (i === 0) { g.fillStyle(colour, 1); g.fillCircle(px(x), py(y), 4); }
      else g.strokeCircle(px(x), py(y), 4);
    }
    const name = seriesLabels[i];
    const end = points[points.length - 1] as [number, number] | undefined;
    if (name && end) {
      const tag = scene.add.text(px(end[0]) - 18, py(end[1]) - 18, name, {
        fontFamily: FONT.mono, fontSize: `${SIZE.label}px`, color: i === 0 ? SERIES_A : SERIES_B,
      });
      objects.push(tag);
    }
  });

  return scene.add.container(0, 0, objects);
}

/**
 * MK-4 double number line: two parallel scales with matching tick positions, so
 * the pairing between the quantities is the thing you see.
 */
function doubleNumberLine(
  scene: Phaser.Scene,
  spec: FigureSpec,
  w: number,
  h: number,
): Phaser.GameObjects.Container {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics();
  objects.push(g);

  const rows = (spec.rows ?? []) as (string | number)[][];
  const pad = 20;
  const span = w - pad * 2;
  const topY = h / 2 - 22;
  const bottomY = h / 2 + 22;

  for (const [rowIndex, y] of [topY, bottomY].entries()) {
    g.lineStyle(STROKE.hud, hex(rowIndex === 0 ? SERIES_A : SERIES_B), 1);
    g.lineBetween(pad, y, pad + span, y);

    const cells = rows[rowIndex] ?? [];
    cells.forEach((cell, i) => {
      const x = pad + (cells.length > 1 ? (i / (cells.length - 1)) * span : span / 2);
      g.lineBetween(x, y - 6, x, y + 6);
      const t = scene.add.text(0, rowIndex === 0 ? y - 26 : y + 10, String(cell), {
        fontFamily: FONT.mono, fontSize: `${SIZE.label}px`, color: C.text,
      });
      t.setX(x - t.width / 2);
      objects.push(t);
    });
  }

  return scene.add.container(0, 0, objects);
}

/**
 * MK-6 dot plot. One dot per value, stacked over its place on the axis, so the
 * shape of the data is the thing you see before any number is computed.
 *
 * `rows` draws two stacked plots (parallel-dot-plots); `marks` draws the labelled
 * quartile lines sp.7.4 reads Q1, the median and Q3 off.
 */
function dotPlot(scene: Phaser.Scene, spec: FigureSpec, w: number, h: number): Phaser.GameObjects.Container {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics();
  objects.push(g);

  const rows = (spec.rows as unknown as number[][] | undefined)
    ?? [((spec.values as number[] | undefined) ?? [])];
  const names = (spec.labels as string[] | undefined) ?? [];
  const all = rows.flat();
  const min = (spec.min as number | undefined) ?? Math.min(0, ...all);
  const max = (spec.max as number | undefined) ?? Math.max(1, ...all);

  const padL = 30;
  const padR = 16;
  // A single plot given the whole 180 px slot sat on the floor of it with all
  // the empty space above. The band is capped and the stack centred, so one
  // plot reads as a figure rather than as something that fell to the bottom.
  const bandH = Math.min(h / rows.length, 110);
  const top = Math.max(0, (h - bandH * rows.length) / 2);
  const at = (v: number): number => padL + ((v - min) / (max - min || 1)) * (w - padL - padR);

  rows.forEach((values, row) => {
    const axisY = top + bandH * (row + 1) - 22;
    const colour = hex(row === 0 ? SERIES_A : SERIES_B);

    g.lineStyle(STROKE.hud, hex(C.textMuted), 1);
    g.lineBetween(padL, axisY, w - padR, axisY);

    const step = stepFor(min, max);
    const first = Math.ceil(min / step) * step;
    for (let v = first; v <= max; v += step) {
      g.lineStyle(STROKE.hairline, hex(C.gridLine), 1);
      g.lineBetween(at(v), axisY - 4, at(v), axisY + 5);
      const t = scene.add.text(0, axisY + 8, tick(v), {
        fontFamily: FONT.mono, fontSize: `${SIZE.label}px`, color: C.textMuted,
      });
      t.setX(at(v) - t.width / 2);
      objects.push(t);
    }

    // Stack repeats upward. Six deep is all the band holds; beyond that the
    // column is capped and the count is written instead of drawn.
    const counts = new Map<number, number>();
    for (const v of [...values].sort((a, b) => a - b)) {
      const n = (counts.get(v) ?? 0) + 1;
      counts.set(v, n);
      if (n <= 6) {
        g.fillStyle(colour, 1);
        g.fillCircle(at(v), axisY - 8 - (n - 1) * 11, 4);
      }
    }
    for (const [v, n] of counts) {
      if (n <= 6) continue;
      const t = scene.add.text(0, axisY - 8 - 6 * 11 - 14, `x${n}`, {
        fontFamily: FONT.mono, fontSize: `${SIZE.label}px`, color: C.textMuted,
      });
      t.setX(at(v) - t.width / 2);
      objects.push(t);
    }

    const name = names[row];
    if (name) {
      const t = scene.add.text(2, top + bandH * row + 2, name, {
        fontFamily: FONT.mono, fontSize: `${SIZE.label}px`, color: row === 0 ? SERIES_A : SERIES_B,
      });
      objects.push(t);
    }

    if (row === 0) {
      for (const m of (spec.marks as { at: number; label: string }[] | undefined) ?? []) {
        g.lineStyle(STROKE.hairline, hex(C.hud), 1);
        g.lineBetween(at(m.at), axisY - bandH + 24, at(m.at), axisY);
        const t = scene.add.text(0, axisY - bandH + 10, m.label, {
          fontFamily: FONT.mono, fontSize: `${SIZE.label}px`, color: C.hud,
        });
        t.setX(at(m.at) - t.width / 2);
        objects.push(t);
      }
    }
  });

  return scene.add.container(0, 0, objects);
}

/**
 * MK-6 box plot. The five-number summary drawn to scale on a shared axis, so two
 * plots can be compared directly. Each of the four sections holds about a quarter
 * of the data however long it looks, which is sp.7.6's whole point.
 */
function boxPlot(scene: Phaser.Scene, spec: FigureSpec, w: number, h: number): Phaser.GameObjects.Container {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics();
  objects.push(g);

  type Five = { min: number; q1: number; median: number; q3: number; max: number };
  const plots = (spec.plots as Five[] | undefined) ?? [];
  const names = (spec.labels as string[] | undefined) ?? [];
  if (plots.length === 0) return scene.add.container(0, 0, objects);

  const all = plots.flatMap((p) => [p.min, p.max]);
  const min = (spec.min as number | undefined) ?? Math.min(...all);
  const max = (spec.max as number | undefined) ?? Math.max(...all);

  const padL = 20;
  const padR = 16;
  const at = (v: number): number => padL + ((v - min) / (max - min || 1)) * (w - padL - padR);

  const axisY = h - 24;
  g.lineStyle(STROKE.hud, hex(C.textMuted), 1);
  g.lineBetween(padL, axisY, w - padR, axisY);
  const step = stepFor(min, max);
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
    g.lineStyle(STROKE.hairline, hex(C.gridLine), 1);
    g.lineBetween(at(v), axisY - 4, at(v), axisY + 5);
    const t = scene.add.text(0, axisY + 8, tick(v), {
      fontFamily: FONT.mono, fontSize: `${SIZE.label}px`, color: C.textMuted,
    });
    t.setX(at(v) - t.width / 2);
    objects.push(t);
  }

  const boxH = Math.min(34, (axisY - 16) / plots.length - 12);
  // Centred in the space above the axis. Pinned to the top, a single plot left
  // two thirds of the slot empty.
  const stack = plots.length * boxH + (plots.length - 1) * 18;
  const first = Math.max(8, (axisY - 10 - stack) / 2);
  plots.forEach((p, i) => {
    const top = first + i * (boxH + 18);
    const mid = top + boxH / 2;
    const colour = hex(i === 0 ? SERIES_A : SERIES_B);
    g.lineStyle(STROKE.hud, colour, 1);

    // whiskers
    g.lineBetween(at(p.min), mid, at(p.q1), mid);
    g.lineBetween(at(p.q3), mid, at(p.max), mid);
    g.lineBetween(at(p.min), top + 6, at(p.min), top + boxH - 6);
    g.lineBetween(at(p.max), top + 6, at(p.max), top + boxH - 6);

    // box and median
    g.strokeRect(at(p.q1), top, Math.max(1, at(p.q3) - at(p.q1)), boxH);
    g.lineStyle(STROKE.hud, hex(C.hud), 1);
    g.lineBetween(at(p.median), top, at(p.median), top + boxH);

    const name = names[i];
    if (name) {
      const t = scene.add.text(2, top - 2, name, {
        fontFamily: FONT.mono, fontSize: `${SIZE.label}px`, color: i === 0 ? SERIES_A : SERIES_B,
      });
      objects.push(t);
    }
  });

  return scene.add.container(0, 0, objects);
}

/**
 * MK-1 likelihood line: 0 to 1 with the five words written under it. A
 * probability is only meaningful against those anchors, so they are always drawn.
 */
function likelihoodLine(scene: Phaser.Scene, spec: FigureSpec, w: number, h: number): Phaser.GameObjects.Container {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics();
  objects.push(g);

  const padL = 24;
  const padR = 24;
  const y = h / 2;
  const at = (p: number): number => padL + p * (w - padL - padR);

  g.lineStyle(STROKE.hud, hex(C.textMuted), 1);
  g.lineBetween(padL, y, w - padR, y);

  // Ticks and their fractions across the top.
  for (const [p, label] of [[0, "0"], [0.25, "1/4"], [0.5, "1/2"], [0.75, "3/4"], [1, "1"]] as [number, string][]) {
    g.lineStyle(STROKE.hairline, hex(C.gridLine), 1);
    g.lineBetween(at(p), y - 7, at(p), y + 7);
    const t = scene.add.text(0, y - 26, label, {
      fontFamily: FONT.mono, fontSize: `${SIZE.label}px`, color: C.text,
    });
    t.setX(at(p) - t.width / 2);
    objects.push(t);
  }

  // The five words underneath, on two rows. Side by side they do not fit the
  // card's figure column: "IMPOSSIBLE UNLIKELY EVEN LIKELY CERTAIN" came out as
  // one unreadable run of overlapping text.
  for (const [p, label, row] of [
    [0, "IMPOSSIBLE", 0], [0.5, "EVEN", 0], [1, "CERTAIN", 0],
    [0.25, "UNLIKELY", 1], [0.75, "LIKELY", 1],
  ] as [number, string, number][]) {
    const t = scene.add.text(0, y + 12 + row * 16, label, {
      fontFamily: FONT.mono, fontSize: `${SIZE.label}px`, color: C.textMuted,
    });
    t.setX(Math.min(w - t.width - 2, Math.max(2, at(p) - t.width / 2)));
    objects.push(t);
  }

  for (const p of (spec.points as number[] | undefined) ?? []) {
    g.fillStyle(hex(SERIES_A), 1);
    g.fillCircle(at(p), y, 6);
  }

  return scene.add.container(0, 0, objects);
}

/**
 * MK-5 tree diagram. One column per stage, every branch drawn, because the
 * count of leaves IS the sample space the player is asked to size.
 */
function treeDiagram(scene: Phaser.Scene, spec: FigureSpec, w: number, h: number): Phaser.GameObjects.Container {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics();
  objects.push(g);

  const stages = (spec.stages as string[][] | undefined) ?? [];
  if (stages.length === 0) return scene.add.container(0, 0, objects);

  const colW = w / (stages.length + 1);
  let parents: number[] = [h / 2];

  stages.forEach((options, depth) => {
    const x = colW * (depth + 1);
    const next: number[] = [];
    const leaves = parents.length * options.length;
    const spacing = Math.max(12, (h - 16) / Math.max(1, leaves));

    parents.forEach((py, pi) => {
      options.forEach((opt, oi) => {
        const index = pi * options.length + oi;
        const y = 8 + spacing * (index + 0.5);
        next.push(y);
        g.lineStyle(STROKE.hairline, hex(depth === 0 ? SERIES_A : C.border), 1);
        g.lineBetween(colW * depth + (depth === 0 ? 0 : 14), py, x, y);
        if (leaves <= 12) {
          const t = scene.add.text(x + 4, y - 8, opt, {
            fontFamily: FONT.mono, fontSize: `${SIZE.label}px`, color: C.text,
          });
          objects.push(t);
        }
      });
    });
    parents = next;
  });

  return scene.add.container(0, 0, objects);
}

/* ------------------------------------------------------------ MK-7 geometry */

/** A dimension label placed at a point, centred on it. */
function mark(
  scene: Phaser.Scene, objects: Phaser.GameObjects.GameObject[],
  x: number, y: number, text: string, colour = C.text,
): void {
  const t = scene.add.text(0, 0, text, {
    fontFamily: FONT.mono, fontSize: `${SIZE.label}px`, color: colour,
  });
  t.setPosition(x - t.width / 2, y - t.height / 2);
  objects.push(t);
}

/**
 * MK-7 circle with its radius or diameter drawn in. The line is drawn as well as
 * labelled: the whole point of the figure is that the player can see which of
 * the two measurements they have been given.
 */
function circleLabelled(scene: Phaser.Scene, spec: FigureSpec, w: number, h: number): Phaser.GameObjects.Container {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics();
  objects.push(g);

  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2 - 28;
  const which = String(spec.which ?? "radius");
  const label = String(spec.label ?? "");

  g.lineStyle(STROKE.hud, hex(SERIES_A), 1);
  g.strokeCircle(cx, cy, r);
  g.fillStyle(hex(C.textMuted), 1);
  g.fillCircle(cx, cy, 3);

  g.lineStyle(STROKE.hud, hex(C.hud), 1);
  if (which === "diameter") {
    g.lineBetween(cx - r, cy, cx + r, cy);
    mark(scene, objects, cx, cy - 14, label, C.hud);
  } else {
    g.lineBetween(cx, cy, cx + r, cy);
    mark(scene, objects, cx + r / 2, cy - 14, label, C.hud);
  }
  return scene.add.container(0, 0, objects);
}

/**
 * MK-7 angle diagram: two lines crossing at a point, with the named angles
 * marked. `rays` are bearings in degrees; `arcs` label the angle between a pair.
 */
function angleDiagram(scene: Phaser.Scene, spec: FigureSpec, w: number, h: number): Phaser.GameObjects.Container {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics();
  objects.push(g);

  const cx = w / 2;
  const cy = h / 2;
  const len = Math.min(w, h) / 2 - 18;
  const rays = (spec.rays as number[] | undefined) ?? [0, 180, 60, 240];
  const arcs = (spec.arcs as { from: number; to: number; label: string }[] | undefined) ?? [];

  const at = (deg: number, d: number): [number, number] => {
    const a = (deg * Math.PI) / 180;
    return [cx + Math.cos(a) * d, cy - Math.sin(a) * d];
  };

  g.lineStyle(STROKE.hud, hex(C.textMuted), 1);
  for (const deg of rays) {
    const [x, y] = at(deg, len);
    g.lineBetween(cx, cy, x, y);
  }

  arcs.forEach((arc, i) => {
    const radius = 28 + i * 14;
    const colour = hex(i === 0 ? SERIES_A : SERIES_B);
    g.lineStyle(STROKE.hud, colour, 1);
    g.beginPath();
    g.arc(cx, cy, radius, (-arc.to * Math.PI) / 180, (-arc.from * Math.PI) / 180, false);
    g.strokePath();
    const mid = (arc.from + arc.to) / 2;
    const [lx, ly] = at(mid, radius + 18);
    mark(scene, objects, lx, ly, arc.label, i === 0 ? SERIES_A : SERIES_B);
  });

  return scene.add.container(0, 0, objects);
}

/**
 * MK-7 transversal: two parallel lines crossed by a third, with the eight angles
 * available to label. Positions are numbered 1-8 left to right, top to bottom,
 * the way the manual page numbers them.
 */
function transversal(scene: Phaser.Scene, spec: FigureSpec, w: number, h: number): Phaser.GameObjects.Container {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics();
  objects.push(g);

  const topY = h * 0.32;
  const botY = h * 0.72;
  const pad = 14;
  // The transversal leans, so the two crossings are offset horizontally.
  const lean = 34;
  const topX = w / 2 - lean;
  const botX = w / 2 + lean;

  g.lineStyle(STROKE.hud, hex(C.textMuted), 1);
  g.lineBetween(pad, topY, w - pad, topY);
  g.lineBetween(pad, botY, w - pad, botY);
  g.lineStyle(STROKE.hud, hex(SERIES_B), 1);
  g.lineBetween(topX - lean * 1.6, topY - (botY - topY) * 0.8, botX + lean * 1.6, botY + (botY - topY) * 0.8);

  // Arrow marks showing the two lines are parallel.
  g.lineStyle(STROKE.hairline, hex(C.hud), 1);
  for (const y of [topY, botY]) {
    g.lineBetween(pad + 16, y - 5, pad + 24, y);
    g.lineBetween(pad + 16, y + 5, pad + 24, y);
  }

  const labels = (spec.labels as string[] | undefined) ?? [];
  // 1 2 above/below the upper crossing, 3 4 below it; 5 6 7 8 at the lower one.
  const spots: [number, number][] = [
    [topX - 26, topY - 16], [topX + 26, topY - 16],
    [topX - 26, topY + 16], [topX + 26, topY + 16],
    [botX - 26, botY - 16], [botX + 26, botY - 16],
    [botX - 26, botY + 16], [botX + 26, botY + 16],
  ];
  labels.forEach((label, i) => {
    const spot = spots[i];
    if (label && spot) mark(scene, objects, spot[0], spot[1], label, i === 0 ? SERIES_A : C.text);
  });

  return scene.add.container(0, 0, objects);
}

/**
 * MK-7 right triangle with its sides labelled, and the right angle drawn as a
 * square. `squares` adds the areas on each side, which is h8.g.b3's whole model.
 */
function rightTriangle(scene: Phaser.Scene, spec: FigureSpec, w: number, h: number): Phaser.GameObjects.Container {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics();
  objects.push(g);

  const withSquares = spec.kind === "squares-on-sides";
  const a = Number(spec.a ?? 3);
  const b = Number(spec.b ?? 4);
  const scale = Math.min((w - (withSquares ? 120 : 60)) / Math.max(a, b), (h - (withSquares ? 90 : 50)) / Math.max(a, b));
  const legX = a * scale;
  const legY = b * scale;

  const ox = (w - legX) / 2 + (withSquares ? 14 : 0);
  const oy = (h + legY) / 2 - (withSquares ? 10 : 0);

  g.lineStyle(STROKE.hud, hex(SERIES_A), 1);
  g.lineBetween(ox, oy, ox + legX, oy);           // horizontal leg
  g.lineBetween(ox, oy, ox, oy - legY);           // vertical leg
  g.lineBetween(ox + legX, oy, ox, oy - legY);    // hypotenuse

  // the right-angle square
  g.lineStyle(STROKE.hairline, hex(C.textMuted), 1);
  g.strokeRect(ox, oy - 10, 10, 10);

  if (withSquares) {
    g.lineStyle(STROKE.hairline, hex(SERIES_B), 1);
    g.strokeRect(ox, oy, legX, Math.min(legX, h - oy - 4));
    g.strokeRect(ox - Math.min(legY, ox - 4), oy - legY, Math.min(legY, ox - 4), legY);
  }

  const la = String(spec.labelA ?? "");
  const lb = String(spec.labelB ?? "");
  const lc = String(spec.labelC ?? "");
  if (la) mark(scene, objects, ox + legX / 2, oy + 12, la, C.hud);
  if (lb) mark(scene, objects, ox - 16, oy - legY / 2, lb, C.hud);
  if (lc) mark(scene, objects, ox + legX / 2 + 14, oy - legY / 2 - 6, lc, C.lock);

  return scene.add.container(0, 0, objects);
}

/**
 * MK-7 composite figure on a grid. `parts` are rectangles in grid units, drawn
 * to scale and outlined together, so the player can see which edges are on the
 * outside.
 */
function gridDecomposition(scene: Phaser.Scene, spec: FigureSpec, w: number, h: number): Phaser.GameObjects.Container {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics();
  objects.push(g);

  const parts = (spec.parts as { x: number; y: number; w: number; h: number; label?: string }[] | undefined) ?? [];
  if (parts.length === 0) return scene.add.container(0, 0, objects);

  const spanX = Math.max(...parts.map((p) => p.x + p.w));
  const spanY = Math.max(...parts.map((p) => p.y + p.h));
  const pad = 18;
  const unit = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY);
  const ox = (w - unit * spanX) / 2;
  const oy = (h - unit * spanY) / 2;

  // grid
  g.lineStyle(STROKE.hairline, hex(C.gridLine), 1);
  for (let x = 0; x <= spanX; x++) g.lineBetween(ox + x * unit, oy, ox + x * unit, oy + spanY * unit);
  for (let y = 0; y <= spanY; y++) g.lineBetween(ox, oy + y * unit, ox + spanX * unit, oy + y * unit);

  parts.forEach((p, i) => {
    const colour = hex(i === 0 ? SERIES_A : SERIES_B);
    g.fillStyle(colour, 0.12);
    g.fillRect(ox + p.x * unit, oy + p.y * unit, p.w * unit, p.h * unit);
    g.lineStyle(STROKE.hud, colour, 1);
    g.strokeRect(ox + p.x * unit, oy + p.y * unit, p.w * unit, p.h * unit);
    if (p.label) {
      mark(scene, objects, ox + (p.x + p.w / 2) * unit, oy + (p.y + p.h / 2) * unit, p.label, C.text);
    }
  });

  return scene.add.container(0, 0, objects);
}

/* -------------------------------------------------------------- MK-8 solids */

/**
 * MK-8 solid, drawn as a labelled box, cylinder, pyramid or cone in the same
 * flat isometric style. `slice` draws the cut plane for a cross-section card.
 */
function solid(scene: Phaser.Scene, spec: FigureSpec, w: number, h: number): Phaser.GameObjects.Container {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics();
  objects.push(g);

  const shape = String(spec.solid ?? "RECTANGULAR PRISM");
  const cx = w / 2;
  const cy = h / 2;
  const bw = Math.min(w - 70, 120);
  const bh = Math.min(h - 60, 90);
  const depth = 22;
  const line = hex(SERIES_A);
  const faint = hex(C.textMuted);

  const left = cx - bw / 2;
  const top = cy - bh / 2;

  g.lineStyle(STROKE.hud, line, 1);
  if (shape === "CYLINDER") {
    g.strokeEllipse(cx, top, bw, depth);
    g.strokeEllipse(cx, top + bh, bw, depth);
    g.lineBetween(left, top, left, top + bh);
    g.lineBetween(cx + bw / 2, top, cx + bw / 2, top + bh);
  } else if (shape === "CONE") {
    g.strokeEllipse(cx, top + bh, bw, depth);
    g.lineBetween(left, top + bh, cx, top);
    g.lineBetween(cx + bw / 2, top + bh, cx, top);
  } else if (shape === "SQUARE PYRAMID" || shape === "TRIANGULAR PYRAMID") {
    g.strokeRect(left, top + bh - depth, bw, depth);
    g.lineBetween(left, top + bh, cx, top);
    g.lineBetween(left + bw, top + bh, cx, top);
    g.lineBetween(left, top + bh, left + bw, top + bh);
    g.lineStyle(STROKE.hairline, faint, 1);
    g.lineBetween(cx, top, cx, top + bh - depth / 2);
  } else if (shape === "TRIANGULAR PRISM") {
    g.lineBetween(left, top + bh, left + bw, top + bh);
    g.lineBetween(left, top + bh, left + bw / 2, top);
    g.lineBetween(left + bw, top + bh, left + bw / 2, top);
    g.lineStyle(STROKE.hairline, faint, 1);
    g.lineBetween(left + depth, top + bh - depth, left + bw + depth, top + bh - depth);
    g.lineBetween(left, top + bh, left + depth, top + bh - depth);
    g.lineBetween(left + bw, top + bh, left + bw + depth, top + bh - depth);
    g.lineBetween(left + bw / 2, top, left + bw / 2 + depth, top - depth);
  } else {
    // rectangular prism
    g.strokeRect(left, top, bw, bh);
    g.lineBetween(left, top, left + depth, top - depth);
    g.lineBetween(left + bw, top, left + bw + depth, top - depth);
    g.lineBetween(left + bw, top + bh, left + bw + depth, top + bh - depth);
    g.lineStyle(STROKE.hairline, faint, 1);
    g.lineBetween(left + depth, top - depth, left + bw + depth, top - depth);
    g.lineBetween(left + bw + depth, top - depth, left + bw + depth, top + bh - depth);
  }

  const slice = spec.slice as string | undefined;
  if (slice) {
    g.lineStyle(STROKE.hud, hex(C.lock), 1);
    if (slice === "PARALLEL TO THE BASE") g.lineBetween(left - 10, cy, left + bw + 30, cy);
    else g.lineBetween(cx, top - 26, cx, top + bh + 14);
  }

  for (const l of (spec.marks as { at: string; label: string }[] | undefined) ?? []) {
    const spots: Record<string, [number, number]> = {
      width: [cx, top + bh + 16],
      height: [left - 20, cy],
      depth: [left + bw + 26, top - 16],
      radius: [cx + bw / 4, top + bh + 4],
      slant: [cx + bw / 4 + 8, cy],
    };
    const spot = spots[l.at] ?? [cx, cy];
    mark(scene, objects, spot[0], spot[1], l.label, C.hud);
  }

  return scene.add.container(0, 0, objects);
}

/**
 * MK-8 net: the solid unfolded flat, so every face the player must count is
 * visible at once. `faces` are rectangles in a small grid, like the composite
 * figure, with each one labelled by what it is.
 */
function net(scene: Phaser.Scene, spec: FigureSpec, w: number, h: number): Phaser.GameObjects.Container {
  const objects: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics();
  objects.push(g);

  const faces = (spec.faces as { x: number; y: number; w: number; h: number; label?: string }[] | undefined) ?? [];
  if (faces.length === 0) return scene.add.container(0, 0, objects);

  const spanX = Math.max(...faces.map((f) => f.x + f.w));
  const spanY = Math.max(...faces.map((f) => f.y + f.h));
  const pad = 14;
  const unit = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY);
  const ox = (w - unit * spanX) / 2;
  const oy = (h - unit * spanY) / 2;

  faces.forEach((f) => {
    g.lineStyle(STROKE.hud, hex(SERIES_A), 1);
    g.strokeRect(ox + f.x * unit, oy + f.y * unit, f.w * unit, f.h * unit);
    // A label only goes in a face with room for it. A net drawn to the solid's
    // real proportions has thin faces, and a 13 px word laid across a 20 px
    // face sits on both of its edges at once.
    if (f.label && f.h * unit >= 28 && f.w * unit >= 44) {
      mark(scene, objects, ox + (f.x + f.w / 2) * unit, oy + (f.y + f.h / 2) * unit, f.label, C.textMuted);
    }
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
    case "ratio-table":
    case "arrow-table":
    case "balance-table":
    case "fact-family":
    case "frequency-table":
    case "proportion-table":
    case "outcome-table":
    case "sample-space-list":
    case "organized-list":
    case "simulation":
      return table(scene, spec, w, h);
    case "coordinate-plane":
    case "table-graph-equation":
    case "y=kx":
    case "scatter-plot":
    case "scatter-plot-with-line":
    case "scatter":
      return coordinatePlane(scene, spec, w, h);
    case "dot-plot":
    case "parallel-dot-plots":
    case "dot-plot-of-sample-means":
    case "quartile-marks":
    case "skew-vs-symmetric":
      return dotPlot(scene, spec, w, h);
    case "box-plot":
    case "side-by-side-box-plots":
      return boxPlot(scene, spec, w, h);
    case "likelihood-line":
      return likelihoodLine(scene, spec, w, h);
    case "tree-diagram":
    case "tree":
      return treeDiagram(scene, spec, w, h);
    case "circle-labelled":
      return circleLabelled(scene, spec, w, h);
    case "angle-diagram":
    case "angle":
      return angleDiagram(scene, spec, w, h);
    case "transversal-diagram":
      return transversal(scene, spec, w, h);
    case "right-triangle-labelled":
    case "squares-on-sides":
      return rightTriangle(scene, spec, w, h);
    case "grid-decomposition":
      return gridDecomposition(scene, spec, w, h);
    case "solids-labelled":
    case "slice-visual":
    case "layers-of-cubes":
    case "base-times-height":
    case "solid":
      return solid(scene, spec, w, h);
    case "net":
    case "can-label-net":
      return net(scene, spec, w, h);
    case "coordinate-plane-right-triangle":
      return coordinatePlane(scene, spec, w, h);
    case "double-number-line":
      return doubleNumberLine(scene, spec, w, h);
    default:
      return null;
  }
}

/** Which Math Kit component a figure belongs to, for debugging and the /dad view. */
export const figureComponent = (spec: FigureSpec | undefined): string | null =>
  spec ? mathKitFor(spec.kind) : null;
