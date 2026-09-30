// The ground under a sortie.
//
// design/README.md ships terrain SWATCHES and says outright that tileable
// textures were not delivered, so the world is drawn rather than tiled: bands
// of coast, desert and open sea with islands and a coastline scrolling past.
//
// It is generated from the mission's own seed, so the same sortie always has
// the same ground. A player who flies a mission twice should recognise it.
//
// Coastlines and island edges come from seeded Perlin noise (noise.ts). Random
// per-step bites read as repeated triangles at speed; noise wanders without
// repeating, and the profile is sampled on a circle so it is periodic with the
// block. A coastline that seamed at the wrap showed as a jump every twenty-odd
// seconds, and that has to stay fixed.
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
import { createNoise2D, fbm2, periodicProfile } from "../noise";

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

/** One coastline sample every 48 px: finer than the eye reads at 190 px/s. */
const COAST_STEP = 48;

/**
 * A strip of world, drawn into a container that is scrolled downward. The strip
 * is two screens tall and its bottom half repeats its top half, so sliding it
 * one screen and resetting is seamless.
 */
export function createTerrain(scene: Phaser.Scene, seed: string): Terrain {
  const rng = mulberry32(hash32(`terrain|${seed}`));
  const noise = createNoise2D(seed);
  const H = CANVAS.height;
  const W = CANVAS.width;

  const container = scene.add.container(0, 0);
  const ground = scene.add.container(0, 0);
  container.add(ground);
  const g = scene.add.graphics();
  ground.add(g);

  // --- the world, described once -----------------------------------------
  // The shape is computed into arrays BEFORE anything is drawn, because the
  // strip is drawn four times and the copies have to be identical.
  const bandCount = 3 + Math.floor(rng() * 2);
  interface BandShape { kind: Band; top: number; height: number; amplitude: number; phase: number }
  const bands: BandShape[] = [];
  let y = 0;
  for (let i = 0; i < bandCount; i++) {
    const kind: Band = rng() < 0.5 ? "SEA" : rng() < 0.6 ? "COAST" : "DESERT";
    // No band may swallow the screen: a single desert filling 600 px reads as a
    // background colour rather than as ground going past.
    const share = 0.55 + rng() * 0.5;
    const height = i === bandCount - 1
      ? Math.max(60, H - y)
      : Math.min(Math.round((H / bandCount) * share), Math.round(H * 0.38));
    bands.push({
      kind,
      top: y,
      height: Math.max(50, height),
      // How far the band's edge wanders, and its own place in the noise field.
      amplitude: 6 + rng() * 20,
      phase: i * 31.7 + rng() * 9,
    });
    y += height;
  }
  // The last band is stretched to the bottom whatever the arithmetic did.
  const last = bands[bands.length - 1]!;
  last.height = Math.max(50, H - last.top);

  interface Island { cx: number; cy: number; r: number; phase: number; lobes: number }
  const islands: Island[] = [];
  bands.forEach((band) => {
    const count = band.kind === "SEA" ? 1 + Math.floor(rng() * 3) : Math.floor(rng() * 2);
    for (let k = 0; k < count; k++) {
      islands.push({
        cx: 60 + rng() * (W - 120),
        cy: band.top + 30 + rng() * Math.max(1, band.height - 60),
        r: 16 + rng() * 40,
        phase: rng() * 50,
        lobes: rng() < 0.45 ? 2 : 1,
      });
    }
  });

  const fillFor = (kind: Band): number =>
    kind === "SEA" ? N.sea : kind === "COAST" ? hex(C.coast) : hex(C.desert);

  /**
   * A wobbly closed blob, its edge driven by noise so no two are alike. The
   * caller owns beginPath/fillPath, which is what lets a two-lobe island fill
   * as one shape.
   */
  const islandPath = (ox: number, offset: number, isle: Island, dx = 0, dy = 0, scale = 1): void => {
    const points = 16;
    const r = isle.r * scale;
    for (let i = 0; i <= points; i++) {
      const a = (i / points) * Math.PI * 2;
      const wobble = 0.62 + 0.5 * (fbm2(
        noise,
        Math.cos(a) * 1.4 + isle.phase + dx,
        Math.sin(a) * 1.4 - isle.phase + dy,
        2,
      ) * 0.5 + 0.5);
      const px = isle.cx + dx + Math.cos(a) * r * wobble;
      const py = isle.cy + dy + Math.sin(a) * r * wobble * 0.72;
      if (i === 0) g.moveTo(ox + px, offset + py);
      else g.lineTo(ox + px, offset + py);
    }
    g.closePath();
  };

  /** Draw one screen of world at the given offset, from the arrays above. */
  const drawScreen = (ox: number, offset: number): void => {
    for (const band of bands) {
      const top = offset + band.top;
      g.fillStyle(fillFor(band.kind), 1);

      if (band.kind === "COAST") {
        // One filled path: the land under the band, plus a coast that wanders
        // above it. The profile repeats with the block, so the seam is gone.
        g.beginPath();
        g.moveTo(ox, top + band.height);
        g.lineTo(ox, top);
        const steps = Math.ceil(W / COAST_STEP);
        for (let i = 1; i <= steps; i++) {
          const t = i * COAST_STEP;
          const wobble = periodicProfile(noise, t, W, band.phase);
          g.lineTo(ox + t, top - wobble * band.amplitude);
        }
        g.lineTo(ox + W, top + band.height);
        g.closePath();
        g.fillPath();
      } else {
        g.fillRect(ox, top, W, band.height);
      }
    }

    // Islands and lakes are the same shape in opposite colours: land in the
    // sea, water on the land.
    for (const isle of islands) {
      const band = bands.find((b) => isle.cy >= b.top && isle.cy < b.top + b.height);
      if (!band) continue;
      g.fillStyle(band.kind === "SEA" ? hex(C.coast) : N.sea, 1);
      g.beginPath();
      islandPath(ox, offset, isle);
      if (isle.lobes > 1) islandPath(ox, offset, isle, isle.r * 0.9, isle.r * 0.35, 0.7);
      g.fillPath();
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
  // Banks of puffs rather than lone ovals: a few overlapping ellipses per
  // anchor, varying in size and alpha, read as cloud from above. Its own
  // container, because it scrolls faster than the ground does.
  const cloudLayer = scene.add.container(0, 0);
  container.add(cloudLayer);
  const clouds = scene.add.graphics();
  cloudLayer.add(clouds);

  for (let i = 0; i < 16; i++) {
    const cx = -W + rng() * (W * 2);
    const cy = -H + rng() * (H * 2);
    const w = 70 + rng() * 130;
    const puffs = 3 + Math.floor(rng() * 3);
    for (let k = 0; k < puffs; k++) {
      const px = cx + (rng() - 0.5) * w * 1.2;
      const py = cy + (rng() - 0.5) * w * 0.4;
      const pw = w * (0.45 + rng() * 0.55);
      clouds.fillStyle(hex(C.cloud), 0.2 + rng() * 0.18);
      clouds.fillEllipse(px, py, pw, pw * 0.34);
    }
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