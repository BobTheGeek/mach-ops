// The ground under a sortie.
//
// design/README.md ships terrain SWATCHES and says outright that tileable
// textures were not delivered, so the world is drawn rather than tiled: bands
// of coast, desert and open sea with islands and a coastline scrolling past.
//
// It is generated from the mission's own seed, so the same sortie always has
// the same ground. A player who flies a mission twice should recognise it.
//
// Everything is drawn once into a strip TWICE the height of the screen and then
// scrolled; when the strip has moved a full screen it jumps back, which is
// invisible because the strip repeats. Redrawing procedural terrain every frame
// would cost more than the whole rest of the sortie.

import Phaser from "phaser";
import { C, N, CANVAS, STROKE, hex } from "../../ui/tokens";
import { mulberry32, hash32 } from "../../engine/rng";

/** Pixels per second the ground slides past at cruise. */
export const TERRAIN_SPEED = 26;

export interface Terrain {
  /** move the ground by one frame */
  update(deltaMs: number): void;
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
  const g = scene.add.graphics();
  container.add(g);

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
  const drawScreen = (offset: number): void => {
    for (const band of bands) {
      g.fillStyle(fillFor(band.kind), 1);
      g.fillRect(0, offset + band.top, W, band.height);
      if (band.kind === "SEA") continue;
      band.coast.forEach((bite, i) => {
        const x = i * 48;
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
      g.fillEllipse(blob.x, offset + blob.y, blob.r * 2, blob.r * 1.4);
    }

    // The grid the HUD reads against, drawn over the ground so it stays legible
    // whatever the terrain underneath is doing.
    g.lineStyle(STROKE.hairline, hex(C.seaGrid), 0.5);
    for (let x = 0; x <= W; x += 64) g.lineBetween(x, offset, x, offset + H);
    for (let gy = 0; gy <= H; gy += 64) g.lineBetween(0, offset + gy, W, offset + gy);
  };

  drawScreen(0);
  drawScreen(-H);

  // --- cloud layer -------------------------------------------------------
  // A few soft shapes above the ground and below the aircraft, at a different
  // speed, which is what makes the height read.
  const clouds = scene.add.graphics();
  container.add(clouds);
  clouds.fillStyle(hex(C.cloud), 0.35);
  for (let i = 0; i < 14; i++) {
    const cx = rng() * W;
    const cy = -H + rng() * (H * 2);
    const w = 60 + rng() * 120;
    clouds.fillEllipse(cx, cy, w, w * 0.34);
  }

  let scroll = 0;

  return {
    update(deltaMs: number): void {
      scroll += (TERRAIN_SPEED * deltaMs) / 1000;
      if (scroll >= H) scroll -= H;
      container.setY(scroll);
    },
    destroy(): void { container.destroy(true); },
  };
}
