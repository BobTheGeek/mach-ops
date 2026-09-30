// Seeded 2D Perlin noise, for the ground under the sortie.
//
// The terrain used to be bands with random bites and ellipse islands: cheap,
// but at 190 px/s it read as repeated triangles and flat ovals. Noise gives
// coastlines and island edges that wander without repeating, while staying
// deterministic: the seed makes the same mission draw the same world, which
// both the terrain and the no-repeat tests depend on.
//
// Pure. No Phaser, no clock, no Math.random — every draw comes from the seed,
// like the rest of the engine.

import { hash32, mulberry32 } from "../engine/rng";

export type Noise2D = (x: number, y: number) => number;

const FADE = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** One of eight unit-ish gradients, chosen by a permutation hash. */
function grad(hash: number, x: number, y: number): number {
  switch (hash & 7) {
    case 0: return x + y;
    case 1: return -x + y;
    case 2: return x - y;
    case 3: return -x - y;
    case 4: return x;
    case 5: return -x;
    case 6: return y;
    default: return -y;
  }
}

/** Classic Perlin, in [-1, 1], deterministic for a seed. */
export function createNoise2D(seed: string | number): Noise2D {
  const rng = mulberry32(hash32(`noise|${seed}`));
  const source = Array.from({ length: 256 }, (_, i) => i);
  for (let i = source.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = source[i]!;
    source[i] = source[j]!;
    source[j] = tmp;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = source[i & 255]!;

  return (x: number, y: number): number => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = FADE(xf);
    const v = FADE(yf);

    const aa = perm[perm[X]! + Y]!;
    const ab = perm[perm[X]! + Y + 1]!;
    const ba = perm[perm[X + 1]! + Y]!;
    const bb = perm[perm[X + 1]! + Y + 1]!;

    const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return Math.max(-1, Math.min(1, lerp(x1, x2, v)));
  };
}

/** Fractal Brownian motion over any 2D noise: octaves stacked at half weight. */
export function fbm2(
  noise: Noise2D,
  x: number,
  y: number,
  octaves = 4,
  lacunarity = 2,
  gain = 0.5,
): number {
  let amplitude = 1;
  let frequency = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * noise(x * frequency, y * frequency);
    norm += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return Math.max(-1, Math.min(1, sum / norm));
}

/**
 * A 1D profile that repeats exactly every `cycle` units.
 *
 * The world is drawn as a repeating block, so a coastline sampled on a line
 * would seam where the block wraps. Sampling a circle in noise space is
 * periodic by construction: cos and sin return to the same point at t+cycle.
 * `phase` gives a band its own wandering without another noise field.
 */
export function periodicProfile(
  noise: Noise2D,
  t: number,
  cycle: number,
  phase: number,
  octaves = 3,
): number {
  const theta = (t / cycle) * Math.PI * 2;
  const r = 2.4;
  return fbm2(noise, Math.cos(theta) * r + phase, Math.sin(theta) * r - phase, octaves);
}