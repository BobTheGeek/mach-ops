// Every literal in the game traces back to design/tokens.json (docs/design.md
// section 12: "Use only tokens; if a new value is needed, add it to tokens.json
// first"). This module is the typed door onto that file — nothing else imports
// the JSON directly.

import raw from "../../design/tokens.json";

export const tokens = raw;

/* ------------------------------------------------------------- colour */

/** Phaser wants 0xRRGGBB numbers; tokens.json holds "#RRGGBB" strings. */
export function hex(css: string): number {
  return Number.parseInt(css.replace("#", ""), 16);
}

export const C = {
  ground: raw.color.ground,
  panel: raw.color.panel,
  panelRaised: raw.color.panelRaised,
  border: raw.color.border,
  gridLine: raw.color.gridLine,
  text: raw.color.text,
  textMuted: raw.color.textMuted,
  hud: raw.color.hud,
  lock: raw.color.lock,
  shield: raw.color.shield,
  alert: raw.color.alert,
  sea: raw.color.sea,
  seaGrid: raw.color.seaGrid,
  // The terrain swatches the Component Library ships. Nothing used them until
  // the sortie had ground under it.
  coast: raw.color.coast,
  desert: raw.color.desert,
  cloud: raw.color.cloud,
  night: raw.color.night,
  bogey: raw.color.bogey,
  bogeyDark: raw.color.bogeyDark,
  correctFill: raw.input.correctFill,
  wrongFill: raw.input.wrongFill,
} as const;

/** The same palette as Phaser numbers. */
export const N = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, hex(v)])) as Record<keyof typeof C, number>;

/* -------------------------------------------------------------- type */

export const FONT = {
  display: `"${raw.font.display.family}", system-ui, sans-serif`,
  mono: `"${raw.font.mono.family}", ui-monospace, monospace`,
  body: `"${raw.font.body.family}", system-ui, sans-serif`,
} as const;

export const SIZE = raw.typeScale;

/** Phaser text styles for the roles the artboards actually use. */
export const TEXT = {
  /** 14 px mono caps, 0.14em tracking — labels on every screen. */
  label: { fontFamily: FONT.mono, fontSize: `${SIZE.label}px`, color: C.textMuted, fontStyle: "500" },
  /** 14 px mono caps used for readouts, 0.10em tracking. */
  readout: { fontFamily: FONT.mono, fontSize: `${SIZE.readout}px`, color: C.textMuted, fontStyle: "500" },
  /** 20 px mono value under a readout label. */
  value: { fontFamily: FONT.mono, fontSize: `${SIZE.number}px`, color: C.text, fontStyle: "600" },
  valueLg: { fontFamily: FONT.mono, fontSize: `${SIZE.numberLg}px`, color: C.text, fontStyle: "600" },
  body: { fontFamily: FONT.body, fontSize: `${SIZE.body}px`, color: C.text },
  bodyLg: { fontFamily: FONT.body, fontSize: `${SIZE.bodyLg}px`, color: C.text },
  h3: { fontFamily: FONT.display, fontSize: `${SIZE.h3}px`, color: C.text, fontStyle: "700" },
  h2: { fontFamily: FONT.display, fontSize: `${SIZE.h2}px`, color: C.text, fontStyle: "700" },
  h1: { fontFamily: FONT.display, fontSize: `${SIZE.h1}px`, color: C.text, fontStyle: "700" },
  wordmark: { fontFamily: FONT.display, fontSize: `${SIZE.wordmark}px`, color: C.text, fontStyle: "700" },
} as const;

/** Caps labels are tracked; Phaser has no letter-spacing, so we space manually. */
export const TRACK = { label: 0.14, readout: 0.1, display: 0.02 } as const;

/* ------------------------------------------------------ layout, motion */

export const CANVAS = raw.canvas;
export const SPACE = raw.space.scale;
export const RADIUS = raw.radius;
export const STROKE = raw.stroke;
export const HIT = raw.hitTarget;
export const MOTION = raw.motion;
export const AUDIO = raw.audio;
export const INPUT = raw.input;
export const BADGE = raw.badge;
export const STRUCTURE = raw.structure;

/** Screen padding from docs/design.md section 5. */
export const SCREEN_PAD = 32;
export const TOPBAR_PAD_Y = 20;

/** Modal dim behind problem cards and panels. */
export const MODAL_DIM = { color: 0x0a1018, alpha: 0.55 } as const;
