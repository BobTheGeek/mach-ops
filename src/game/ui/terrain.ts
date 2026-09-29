// The ground under a sortie.
//
// design/README.md ships terrain SWATCHES and says outright that tileable
// textures were not delivered, so the world is drawn rather than tiled: bands
// of coast, desert and open sea with islands and a coastline scrolling past.
//
// It is generated from the mission's own seed, so the same sortie always has
// the same ground. A player who flies a mission twice should recognise it.
//
// Everything is drawn once into a block FOUR screens big (two wide by two tall)
// and then scrolled; when it has moved a full screen in either axis it jumps
// back, which is invisible because the block repeats. Redrawing procedural
// terrain every frame would cost more than the whole rest of the sortie.
//
// It scrolls with the aircraft, not on a fixed timer. Turning swings the ground
// sideways, which is the only thing on screen that says the turn did anything.

import Phaser from "phaser";
import { C, N, CANVAS, STROKE, hex } from "../../ui/tokens";
import { mulberry32, hash32 } from "../../engine/rng";

/**
 * How much of the aircraft's own motion each layer takes.
 *
 * The ground is far below and lags; the clouds are just under the aircraft and
 * very nearly keep up. The gap between the two is what reads as height.
 */
export const GROUND_PARALLAX = 0.5;
export const CLOUD_PARALLAX = 0.85;

export interface Terrain {
  /**
   * Move the world by one frame. dx and dy are the pixels the world travels
   * this frame, which is the same delta the bogeys get: the aircraft holds
   * station and everything else slides past it.
   */
  update(dx: number, dy: number): void;
  destroy(): void;
}

type Band = "SEA" | "COAST" | "DESERT";

/**
 * A strip of world, drawn into a container that is scrolled downward. The strip
 * is two screens tall and its bottom half repeats its top half, so sliding it
 * one screen and resetting is seamless.
 */
export function createTerrain(scene: Phaser.Scene, seed: string): Terrain {
  const rng = mulberry32(hash32(`terrain|${seed}`));
  const H = CANVAS.height;
  const W = CANVAS.width;

  const container = scene.add.container(0, 0);
  const ground = scene.add.container(0, 0);
  container.add(ground);
  const g = scene.add.graphics();
  ground.add(g);

  // --- the world, described once -----------------------------------------
  // The shape is computed into arrays BEFORE anything is drawn, because the
  // strip is drawn twice and the two copies have to be identical. Drawing
  // straight from the rng gave the top and bottom halves different coastlines,
  // and the wrap showed as a jump every twenty-odd seconds.
  const bandCount = 3 + Math.floor(rng() * 2);
  const bands: { kind: Band; top: number; height: number; coast: number[] }[] = [];
  let y = 0;
  for (let i = 0; i < bandCount; i++) {
    const kind: Band = rng() < 0.5 ? "SEA" : rng() < 0.6 ? "COAST" : "DESERT";
    // No band may swallow the screen: a single desert filling 600 px reads as a
    // background colour rather than as ground going past.
    const share = 0.55 + rng() * 0.5;
    const height = i === bandCount - 1
      ? Math.max(60, H - y)
      : Math.min(Math.round((H / bandCount) * share), Math.round(H * 0.38));
    // A coastline is a ragged edge: one height per step along the top of the
    // band, drawn as overlapping wedges of varying size.
    const steps = Math.ceil(W / 48) + 1;
    const coast = Array.from({ length: steps }, () => 6 + rng() * 30);
    bands.push({ kind, top: y, height: Math.max(50, height), coast });
    y += height;
  }
  // The last band is stretched to the bottom whatever the arithmetic did.
  const last = bands[bands.length - 1]!;
  last.height = Math.max(50, H - last.top);

  interface Blob { x: number; y: number; r: number; band: number }
  const blobs: Blob[] = [];
  bands.forEach((band, i) => {
    const count = band.kind === "SEA" ? 1 + Math.floor(rng() * 3) : Math.floor(rng() * 2);
    for (let k = 0; k < count; k++) {
      blobs.push({
        x: 40 + rng() * (W - 80),
        y: band.top + 20 + rng() * Math.max(1, band.height - 40),
        r: 14 + rng() * 34,
        band: i,
      });
    }
  });

  const fillFor = (kind: Band): number =>
    kind === "SEA" ? N.sea : kind === "COAST" ? hex(C.coast) : hex(C.desert);

  /** Draw one screen of world at the given offset, from the arrays above. */
  const drawScreen = (ox: number, offset: number): void => {
    for (const band of bands) {
      g.fillStyle(fillFor(band.kind), 1);
      g.fillRect(ox, offset + band.top, W, band.height);
      if (band.kind === "SEA") continue;
      band.coast.forEach((bite, i) => {
        const x = ox + i * 48;
        g.fillTriangle(
          x, offset + band.top,
          x + 48, offset + band.top,
          x + 24, offset + band.top - bite,
        );
      });
    }

    for (const blob of blobs) {
      const kind = bands[blob.band]!.kind;
      g.fillStyle(kind === "SEA" ? hex(C.coast) : N.sea, 1);
      g.fillEllipse(ox + blob.x, offset + blob.y, blob.r * 2, blob.r * 1.4);
    }

    // The grid the HUD reads against, drawn over the ground so it stays legible
    // whatever the terrain underneath is doing.
    g.lineStyle(STROKE.hairline, hex(C.seaGrid), 0.5);
    for (let x = 0; x <= W; x += 64) g.lineBetween(ox + x, offset, ox + x, offset + H);
    for (let ly = 0; ly <= H; ly += 64) g.lineBetween(ox, offset + ly, ox + W, offset + ly);
  };

  // Four copies, so the block wraps in both axes and a turn can slide the
  // ground sideways without running off the edge of what was drawn.
  for (const ox of [0, -W]) for (const oy of [0, -H]) drawScreen(ox, oy);

  // --- cloud layer -------------------------------------------------------
  // A few soft shapes above the ground and below the aircraft, at a different
  // speed, which is what makes the height read. Its own container, because it
  // scrolls faster than the ground does.
  const cloudLayer = scene.add.container(0, 0);
  container.add(cloudLayer);
  const clouds = scene.add.graphics();
  cloudLayer.add(clouds);
  clouds.fillStyle(hex(C.cloud), 0.35);
  for (let i = 0; i < 14; i++) {
    const cx = -W + rng() * (W * 2);
    const cy = -H + rng() * (H * 2);
    const w = 60 + rng() * 120;
    clouds.fillEllipse(cx, cy, w, w * 0.34);
  }

  // Scroll positions, kept inside one screen so the numbers never grow without
  // bound over a long sortie.
  const wrap = (v: number, span: number): number => ((v % span) + span) % span;
  let gx = 0, gy = 0, cx = 0, cy = 0;

  return {
    update(dx: number, dy: number): void {
      gx = wrap(gx + dx * GROUND_PARALLAX, W);
      gy = wrap(gy + dy * GROUND_PARALLAX, H);
      ground.setPosition(gx, gy);

      cx = wrap(cx + dx * CLOUD_PARALLAX, W);
      cy = wrap(cy + dy * CLOUD_PARALLAX, H);
      cloudLayer.setPosition(cx, cy);
    },
    destroy(): void { container.destroy(true); },
  };
}
