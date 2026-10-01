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
  const key = Object.keys(SVG_URLS).find((k) => k.endsWith(`/${name}.svg`))
    ?? Object.keys(MEDAL_SVG_URLS).find((k) => k.endsWith(`/${name}.svg`));
  if (!key) throw new Error(`no sprite design/svg/${name}.svg`);
  return (SVG_URLS[key] ?? MEDAL_SVG_URLS[key])!;
}

export function hasSprite(name: string): boolean {
  return Object.keys(SVG_URLS).some((k) => k.endsWith(`/${name}.svg`));
}

/* ------------------------------------------------------------- medals */

/** Medal sheets, vendored from the design handoff under their own folder. */
const MEDAL_SVG_URLS = import.meta.glob("../../design/svg/medals/*.svg", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** The 15 medal sprites the handoff ships, by texture key. */
export const MEDAL_SPRITE_FILES: readonly string[] = [
  "medal-1-earned", "medal-1-locked", "medal-1-new",
  "medal-2-earned", "medal-2-locked", "medal-2-new",
  "medal-3-earned", "medal-3-locked", "medal-3-new",
  "ribbon-1-earned", "ribbon-1-locked",
  "ribbon-2-earned", "ribbon-2-locked",
  "ribbon-3-earned", "ribbon-3-locked",
];

/** Texture key for a medal sprite. Ribbons have no `new` state. */
export function medalKey(
  tier: 1 | 2 | 3,
  state: "earned" | "locked" | "new",
  kind: "pendant" | "ribbon" = "pendant",
): string {
  const prefix = kind === "ribbon" ? "ribbon" : "medal";
  const resolved = kind === "ribbon" && state === "new" ? "earned" : state;
  return `${prefix}-${tier}-${resolved}`;
}

/** Rasterise every medal sheet: pendants at 300 px, ribbons at 120 px. */
export async function loadMedalSprites(scene: Phaser.Scene): Promise<void> {
  const variants: Variant[] = MEDAL_SPRITE_FILES.map((name) => ({
    key: name,
    file: `medals/${name}`,
    size: name.startsWith("ribbon") ? 120 : 300,
  }));
  await loadSprites(scene, variants);
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
  // Alternative paint schemes, where the design ships one. The file naming is
  // not symmetric — `t38-top-nasa` but `t38-side-nasa-gear` — so both spellings
  // are offered and the ones with no file are filtered out below.
  for (const livery of ["nasa", "blueangels"]) {
    list.push(
      { key: `${airframe}-top-${livery}`, file: `${airframe}-top-${livery}`, size: PLAYER_SPRITE, hide: ["flame"] },
      { key: `${airframe}-top-${livery}-flame`, file: `${airframe}-top-${livery}`, size: PLAYER_SPRITE },
      { key: `${airframe}-side-${livery}-gear`, file: `${airframe}-side-${livery}-gear`, size: HANGAR_SPRITE },
    );
  }
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
  // Textures live on the game, not the scene, and a key always rasterises to
  // the same picture, so anything already loaded is left alone. Removing and
  // re-adding it would hand every sprite already drawing with that key a dead
  // frame: the bogeys are in every variant list and are on screen mid-sortie
  // when the flown airframe loads, and re-adding theirs blanked the sortie.
  const wanted = variants.filter((v) => !scene.textures.exists(v.key));
  const rastered = await Promise.all(wanted.map(rasterise));
  for (const { key, canvas } of rastered) {
    if (scene.textures.exists(key)) continue;
    scene.textures.addCanvas(key, canvas);
  }
}

export type { Variant };
