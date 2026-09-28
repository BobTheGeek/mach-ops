// Sprite loading. DESIGN_RECONCILIATION.md section 5:
//
//   <id>-top              sortie texture at 120 px
//   <id>-top-silhouette   locked
//   <id>-side             hangar / dossier
//   <id>-side-gear        hangar floor
//   <id>-side-silhouette  next-unlock teaser
//
// and "Phaser: rasterize per state (flame on/off, gear up/down) at load rather
// than animating SVG at runtime". So flame variants are produced by hiding the
// `flame` layer in a copy of the markup before rasterising; the files on disk
// are never modified.

import type Phaser from "phaser";

/** Vite resolves these at build time, so design/svg stays the single source. */
const SVG_URLS = import.meta.glob("../../design/svg/*.svg", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Rasterise at 2x the display size so edges stay crisp on a HiDPI Chromebook. */
export const RASTER_SCALE = 2;

/** Sortie sprite size from design/README.md: player 120 px, bogeys 72 px. */
export const PLAYER_SPRITE = 120;
export const BOGEY_SPRITE = 72;
export const HANGAR_SPRITE = 320;

export function svgUrl(name: string): string {
  const key = Object.keys(SVG_URLS).find((k) => k.endsWith(`/${name}.svg`));
  if (!key) throw new Error(`no sprite design/svg/${name}.svg`);
  return SVG_URLS[key]!;
}

export function hasSprite(name: string): boolean {
  return Object.keys(SVG_URLS).some((k) => k.endsWith(`/${name}.svg`));
}

interface Variant {
  /** texture key to register */
  key: string;
  /** file in design/svg, without .svg */
  file: string;
  /** longest side, in CSS pixels */
  size: number;
  /** hide these layer ids before rasterising */
  hide?: string[];
}

/** Read the viewBox so the raster keeps the drawing's aspect ratio. */
function viewBox(markup: string): { w: number; h: number } {
  const m = /viewBox="([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)"/.exec(markup);
  if (!m) return { w: 1, h: 1 };
  return { w: Number(m[3]), h: Number(m[4]) };
}

function hideLayers(markup: string, ids: readonly string[]): string {
  let out = markup;
  for (const id of ids) {
    out = out.replace(new RegExp(`(<g id="${id}")`, "g"), `$1 style="display:none"`);
  }
  return out;
}

async function rasterise(v: Variant): Promise<{ key: string; canvas: HTMLCanvasElement }> {
  const markup = await fetch(svgUrl(v.file)).then((r) => r.text());
  const prepared = v.hide?.length ? hideLayers(markup, v.hide) : markup;

  const box = viewBox(prepared);
  const long = Math.max(box.w, box.h);
  const w = Math.round((box.w / long) * v.size * RASTER_SCALE);
  const h = Math.round((box.h / long) * v.size * RASTER_SCALE);

  const blob = new Blob([prepared], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image(w, h);
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`could not rasterise ${v.file}`));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return { key: v.key, canvas };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Every texture the Phase 2 scenes need: the T-38 and the three bogeys. */
export function phase2Variants(airframe = "t38"): Variant[] {
  const list: Variant[] = [
    { key: `${airframe}-top`, file: `${airframe}-top`, size: PLAYER_SPRITE, hide: ["flame"] },
    { key: `${airframe}-top-flame`, file: `${airframe}-top`, size: PLAYER_SPRITE },
    { key: `${airframe}-top-silhouette`, file: `${airframe}-top-silhouette`, size: PLAYER_SPRITE },
    { key: `${airframe}-side`, file: `${airframe}-side`, size: HANGAR_SPRITE },
    { key: `${airframe}-side-gear`, file: `${airframe}-side-gear`, size: HANGAR_SPRITE },
    { key: `${airframe}-side-silhouette`, file: `${airframe}-side-silhouette`, size: HANGAR_SPRITE },
  ];
  for (const b of ["bogey1", "bogey2", "bogey3"]) {
    list.push({ key: `${b}-top`, file: `${b}-top`, size: BOGEY_SPRITE });
  }
  return list.filter((v) => hasSprite(v.file));
}

/**
 * Rasterise every variant and register it as a Phaser texture.
 * Call from a preload scene and await before starting the game scenes.
 */
export async function loadSprites(scene: Phaser.Scene, variants: Variant[]): Promise<void> {
  const rastered = await Promise.all(variants.map(rasterise));
  for (const { key, canvas } of rastered) {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, canvas);
  }
}

export type { Variant };
