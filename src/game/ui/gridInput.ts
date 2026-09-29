// The three interactive answer inputs: AI-3 plot a point, AI-4 drag a line and
// AI-5 shade a region.
//
// All three are the same coordinate grid with a different thing to move on it,
// so they share one component. Every one of them snaps to lattice points: the
// answer to "where do these two lines cross" is (3, −2), not (3.04, −1.97), and
// a grid that reports what the finger did rather than what it meant would mark
// a right answer wrong.
//
// Each input is drivable two ways. Pointer for the Chromebook's trackpad or
// touchscreen, and the arrow keys for a player who cannot hit a 20 px target —
// docs/design.md section 9 asks for that, and a drag-only input would be the
// one part of the game a keyboard could not reach.

import Phaser from "phaser";
import { C, SIZE, FONT, STROKE, hex, tokens } from "../../ui/tokens";
import type { Answer } from "../../engine/types";
import { rat, fmtInt, cmp, type Rational } from "../../engine/rational";
import { audio } from "../audio";

const SERIES_A = tokens.color.mathKit.seriesA;
const SERIES_B = tokens.color.mathKit.seriesB;

export type GridMode = "point" | "line" | "region";

export interface GridInputOpts {
  scene: Phaser.Scene;
  mode: GridMode;
  width: number;
  height: number;
  /** grid extent; the same number of units each way */
  span: number;
  /** region mode draws this boundary and asks which side */
  boundary?: { m: Rational; b: Rational; strict: boolean };
  /** axis names, drawn at the ends */
  labels?: [string, string];
  /** fired after every move, so the card can read the entry back in words */
  onChange?: () => void;
}

export interface GridInput {
  container: Phaser.GameObjects.Container;
  height: number;
  /** null until the player has actually entered something */
  value(): Answer | null;
  /** how the entry reads on the feedback line */
  text(): string;
  /** stop taking input, after a commit */
  lock(): void;
  /** draw the right answer over the top, after a wrong commit */
  reveal(answer: Answer): void;
  /** arrow-key nudge; returns true when the key was used */
  key(k: string): boolean;
  destroy(): void;
}

/** A point on the grid, in grid units. */
interface P { x: number; y: number }

export function createGridInput(o: GridInputOpts): GridInput {
  const { scene, mode, width, height, span } = o;
  const objects: Phaser.GameObjects.GameObject[] = [];
  const container = scene.add.container(0, 0);

  const pad = 24;
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;
  const unitX = plotW / (span * 2);
  const unitY = plotH / (span * 2);
  const cx = pad + plotW / 2;
  const cy = pad + plotH / 2;

  const sx = (x: number): number => cx + x * unitX;
  const sy = (y: number): number => cy - y * unitY;
  const gx = (px: number): number => Math.round((px - cx) / unitX);
  const gy = (py: number): number => Math.round((cy - py) / unitY);
  const clamp = (v: number): number => Math.max(-span, Math.min(span, v));

  const grid = scene.add.graphics();
  const ink = scene.add.graphics();
  objects.push(grid, ink);

  /* ---------------------------------------------------------- the grid */

  const step = span <= 6 ? 1 : span <= 12 ? 2 : 5;
  grid.lineStyle(STROKE.hairline, hex(C.gridLine), 1);
  for (let v = -span; v <= span; v += step) {
    grid.lineBetween(sx(v), sy(-span), sx(v), sy(span));
    grid.lineBetween(sx(-span), sy(v), sx(span), sy(v));
  }
  grid.lineStyle(STROKE.hud, hex(C.textMuted), 1);
  grid.lineBetween(sx(-span), sy(0), sx(span), sy(0));
  grid.lineBetween(sx(0), sy(-span), sx(0), sy(span));

  const tick = (v: number, x: boolean): void => {
    const t = scene.add.text(0, 0, fmtInt(v), {
      fontFamily: FONT.mono, fontSize: `${SIZE.label}px`, color: C.textMuted,
    });
    if (x) t.setPosition(sx(v) - t.width / 2, sy(0) + 5);
    else t.setPosition(sx(0) - t.width - 6, sy(v) - t.height / 2);
    objects.push(t);
    container.add(t);
  };
  tick(span, true);
  tick(-span, true);
  tick(span, false);
  tick(-span, false);
  const origin = scene.add.text(sx(0) - 12, sy(0) + 5, "0", {
    fontFamily: FONT.mono, fontSize: `${SIZE.label}px`, color: C.textMuted,
  });
  objects.push(origin);

  if (o.labels) {
    // Both labels are pulled back INSIDE the plot: left-aligned at the right end
    // ran "MINUTES" out through the card's border.
    const xl = scene.add.text(0, sy(0) - 20, o.labels[0], {
      fontFamily: FONT.mono, fontSize: `${SIZE.label}px`, color: C.textMuted,
    });
    xl.setX(sx(span) - xl.width - 4);
    const yl = scene.add.text(sx(0) + 8, sy(span) - 2, o.labels[1], {
      fontFamily: FONT.mono, fontSize: `${SIZE.label}px`, color: C.textMuted,
    });
    objects.push(xl, yl);
  }

  /* -------------------------------------------------------- the entry */

  // point mode: one marker. line mode: two handles. region mode: a side.
  let point: P | null = null;
  const handles: P[] = mode === "line"
    ? [{ x: -Math.max(2, Math.round(span / 2)), y: 0 }, { x: Math.max(2, Math.round(span / 2)), y: 0 }]
    : [];
  let side: "ABOVE" | "BELOW" | null = null;
  let held = 0;
  let locked = false;
  let revealed: { kind: "point"; p: P } | { kind: "line"; m: Rational; b: Rational } | null = null;

  /** m and b of the line through the two handles, or null when it is vertical. */
  const lineOfHandles = (): { m: Rational; b: Rational } | null => {
    const [a, b2] = handles as [P, P];
    if (a.x === b2.x) return null;
    const m = rat(b2.y - a.y, b2.x - a.x);
    // b = y - m x, worked on the first handle.
    const bb = rat(a.y * m.d - m.n * a.x, m.d);
    return { m, b: bb };
  };

  const fmtLine = (m: Rational, b: Rational): string => {
    // A flat line is "y = 3", not "y = 0x + 3", and a flat line through the
    // origin is "y = 0" rather than "y = 0x".
    if (m.n === 0) return `y = ${fmtInt(b.n)}${b.d === 1 ? "" : `/${b.d}`}`;
    const mm = m.d === 1 ? (m.n === 1 ? "x" : m.n === -1 ? "−x" : `${fmtInt(m.n)}x`) : `(${fmtInt(m.n)}/${m.d})x`;
    if (b.n === 0) return `y = ${mm}`;
    return `y = ${mm} ${b.n < 0 ? "−" : "+"} ${fmtInt(Math.abs(b.n))}${b.d === 1 ? "" : `/${b.d}`}`;
  };

  const draw = (): void => {
    ink.clear();

    if (o.boundary) {
      const { m, b, strict } = o.boundary;
      const at = (x: number): number => (m.n * x) / m.d + b.n / b.d;
      ink.lineStyle(STROKE.hud, hex(SERIES_B), 1);
      if (strict) {
        // A dashed boundary: the line itself is NOT part of the region, and the
        // registry makes that its own error tag.
        const stepX = (span * 2) / 24;
        for (let x = -span; x < span; x += stepX * 2) {
          ink.lineBetween(sx(x), sy(at(x)), sx(Math.min(span, x + stepX)), sy(at(Math.min(span, x + stepX))));
        }
      } else {
        ink.lineBetween(sx(-span), sy(at(-span)), sx(span), sy(at(span)));
      }
      if (side) {
        ink.fillStyle(hex(SERIES_A), 0.18);
        const top = side === "ABOVE";
        ink.beginPath();
        ink.moveTo(sx(-span), sy(at(-span)));
        ink.lineTo(sx(span), sy(at(span)));
        ink.lineTo(sx(span), sy(top ? span : -span));
        ink.lineTo(sx(-span), sy(top ? span : -span));
        ink.closePath();
        ink.fillPath();
      }
    }

    if (mode === "line") {
      const line = lineOfHandles();
      ink.lineStyle(STROKE.hud, hex(SERIES_A), 1);
      if (line) {
        const at = (x: number): number => (line.m.n * x) / line.m.d + line.b.n / line.b.d;
        ink.lineBetween(sx(-span), sy(at(-span)), sx(span), sy(at(span)));
      } else {
        ink.lineBetween(sx(handles[0]!.x), sy(-span), sx(handles[0]!.x), sy(span));
      }
      handles.forEach((h, i) => {
        ink.fillStyle(hex(i === held ? C.hud : SERIES_A), 1);
        ink.fillCircle(sx(h.x), sy(h.y), 7);
        ink.lineStyle(STROKE.hud, hex(C.ground), 1);
        ink.strokeCircle(sx(h.x), sy(h.y), 7);
      });
    }

    if (mode === "point" && point) {
      ink.fillStyle(hex(SERIES_A), 1);
      ink.fillCircle(sx(point.x), sy(point.y), 7);
      ink.lineStyle(STROKE.hairline, hex(C.hud), 1);
      ink.lineBetween(sx(point.x), sy(0), sx(point.x), sy(point.y));
      ink.lineBetween(sx(0), sy(point.y), sx(point.x), sy(point.y));
    }

    if (revealed) {
      ink.lineStyle(STROKE.hud, hex(C.hud), 1);
      if (revealed.kind === "point") {
        ink.strokeCircle(sx(revealed.p.x), sy(revealed.p.y), 11);
      } else {
        const { m, b } = revealed;
        const at = (x: number): number => (m.n * x) / m.d + b.n / b.d;
        ink.lineBetween(sx(-span), sy(at(-span)), sx(span), sy(at(span)));
      }
    }
  };

  /* ------------------------------------------------------------ input */

  const zone = scene.add.zone(pad, pad, plotW, plotH).setOrigin(0, 0).setInteractive({ useHandCursor: true });
  objects.push(zone);

  const place = (px: number, py: number): void => {
    if (locked) return;
    const x = clamp(gx(px));
    const y = clamp(gy(py));
    if (mode === "point") {
      point = { x, y };
    } else if (mode === "line") {
      // Whichever handle is nearer to the tap is the one that moves.
      const d = (h: P): number => (h.x - x) ** 2 + (h.y - y) ** 2;
      held = d(handles[0]!) <= d(handles[1]!) ? 0 : 1;
      const other = handles[1 - held]!;
      // Two handles in the same place define no line at all.
      if (other.x !== x || other.y !== y) handles[held] = { x, y };
    } else if (o.boundary) {
      const at = (mx: number): number => (o.boundary!.m.n * mx) / o.boundary!.m.d + o.boundary!.b.n / o.boundary!.b.d;
      side = y > at(x) ? "ABOVE" : "BELOW";
    }
    audio.play("uiMove");
    draw();
    o.onChange?.();
  };

  let dragging = false;
  zone.on("pointerdown", (p: Phaser.Input.Pointer) => {
    dragging = true;
    const local = container.getWorldTransformMatrix().applyInverse(p.worldX, p.worldY);
    place(local.x, local.y);
  });
  zone.on("pointermove", (p: Phaser.Input.Pointer) => {
    if (!dragging || mode === "region") return;
    const local = container.getWorldTransformMatrix().applyInverse(p.worldX, p.worldY);
    place(local.x, local.y);
  });
  zone.on("pointerup", () => { dragging = false; });
  zone.on("pointerout", () => { dragging = false; });

  const nudge = (dx: number, dy: number): void => {
    if (locked) return;
    if (mode === "point") {
      point = { x: clamp((point?.x ?? 0) + dx), y: clamp((point?.y ?? 0) + dy) };
    } else if (mode === "line") {
      const h = handles[held]!;
      const other = handles[1 - held]!;
      const next = { x: clamp(h.x + dx), y: clamp(h.y + dy) };
      if (next.x !== other.x || next.y !== other.y) handles[held] = next;
    } else if (o.boundary) {
      side = dy > 0 ? "ABOVE" : dy < 0 ? "BELOW" : side;
    }
    audio.play("uiMove");
    draw();
    o.onChange?.();
  };

  draw();
  container.add(objects);

  return {
    container,
    height,

    value(): Answer | null {
      if (mode === "point") return point ? [rat(point.x), rat(point.y)] : null;
      if (mode === "line") {
        const line = lineOfHandles();
        return line ? [line.m, line.b] : null;
      }
      return side;
    },

    text(): string {
      if (mode === "point") return point ? `(${fmtInt(point.x)}, ${fmtInt(point.y)})` : "";
      if (mode === "line") {
        const line = lineOfHandles();
        return line ? fmtLine(line.m, line.b) : "a vertical line";
      }
      return side ?? "";
    },

    lock(): void { locked = true; zone.disableInteractive(); },

    reveal(answer: Answer): void {
      if (mode === "point" && Array.isArray(answer) && answer.length === 2) {
        const [ax, ay] = answer as [Rational, Rational];
        revealed = { kind: "point", p: { x: ax.n / ax.d, y: ay.n / ay.d } };
      } else if (mode === "line" && Array.isArray(answer) && answer.length === 2) {
        const [m, b] = answer as [Rational, Rational];
        revealed = { kind: "line", m, b };
      }
      draw();
    },

    key(k: string): boolean {
      if (k === "ArrowLeft") { nudge(-1, 0); return true; }
      if (k === "ArrowRight") { nudge(1, 0); return true; }
      if (k === "ArrowUp") { nudge(0, 1); return true; }
      if (k === "ArrowDown") { nudge(0, -1); return true; }
      if (mode === "line" && (k === "Tab" || k === " ")) { held = 1 - held; draw(); return true; }
      return false;
    },

    destroy(): void { container.destroy(true); },
  };
}

/** Two grid answers are the same when every coordinate matches exactly. */
export const sameGridAnswer = (a: Answer, b: Answer): boolean => {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => {
      const p = v as Rational;
      const q = b[i] as Rational;
      return cmp(p, q) === 0;
    });
  }
  return a === b;
};
