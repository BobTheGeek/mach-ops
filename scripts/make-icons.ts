// Rasterizes design/icon/mach-ops-icon.svg into the PWA icon set in
// public/icons/. The maskable export scales the artwork to 80% (≈20% safe-zone
// padding) over the same background so launcher masks never clip the airframe.
//
// Run: pnpm icons

import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "..");
const SOURCE = join(ROOT, "design", "icon", "mach-ops-icon.svg");
const OUT_DIR = join(ROOT, "public", "icons");

/** #0a1018 as RGBA, the icon's ground colour. */
const GROUND = { r: 10, g: 16, b: 24, alpha: 1 };

/** 20% of 512, split evenly around the artwork. */
const MASKABLE_PAD = 51;

const PLAIN: Array<{ file: string; size: number }> = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon-180.png", size: 180 },
];

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const svg = readFileSync(SOURCE);

  for (const { file, size } of PLAIN) {
    await sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(join(OUT_DIR, file));
  }

  const artwork = 512 - MASKABLE_PAD * 2;
  await sharp(svg, { density: 384 })
    .resize(artwork, artwork)
    // Flatten the rounded square's transparent corners onto the ground colour
    // first: a maskable icon must be fully opaque edge to edge.
    .flatten({ background: GROUND })
    .extend({ top: MASKABLE_PAD, bottom: MASKABLE_PAD, left: MASKABLE_PAD, right: MASKABLE_PAD, background: GROUND })
    .png({ compressionLevel: 9 })
    .toFile(join(OUT_DIR, "icon-512-maskable.png"));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
