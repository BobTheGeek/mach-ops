// The hangar shop.
//
// Credits had exactly one sink, HINT at 50, so a pilot twenty sorties in was
// sitting on thousands of them with nothing to want. This is the sink.
//
// Two rules hold the whole catalogue together.
//
// It sells LOOKS, never ADVANTAGE. The moment credits buy a shield or an extra
// second, the fastest route to the reward is to stop thinking, and the game
// starts teaching the wrong lesson. Nothing here touches the maths, the timer or
// the tiers.
//
// And it only sells what the game can actually draw. Every item below renders
// from a sprite the design ships or from tokens already in the palette, so
// nothing arrives looking like a placeholder.

import { FLEET } from "./fleet";

export type ShopKind = "livery" | "hud" | "reticle";

export interface ShopItem {
  id: string;
  name: string;
  /** one line, what he is actually buying */
  blurb: string;
  cost: number;
  kind: ShopKind;
  /** liveries only: which airframe wears it */
  airframe?: string;
  /** liveries only: the sprite suffix, e.g. "nasa" */
  livery?: string;
  /** hud and reticle: the token colour or style key applied */
  value?: string;
}

/**
 * Prices.
 *
 * A correct answer pays 100 before bonuses and a sortie asks six to twelve, so a
 * sortie is worth roughly 600 to 1,500. A livery is about two good sorties; the
 * cheaper HUD and reticle items are one. Everything is reachable in a week of
 * play, and nothing is so cheap it is bought without thinking.
 */
export const PRICE = { livery: 1200, hud: 600, reticle: 450 } as const;

/** The real alternative paint schemes: one per airframe that ships one. */
const LIVERIES: ShopItem[] = FLEET.flatMap((f) =>
  f.liveries.map((l) => ({
    id: `livery.${f.airframe}.${l.id}`,
    name: `${f.designation} · ${l.label}`,
    blurb: l.id === "nasa"
      ? "The white and blue NASA research scheme, as flown at Dryden."
      : "The blue and gold of the US Navy flight demonstration squadron.",
    cost: PRICE.livery,
    kind: "livery" as const,
    airframe: f.airframe,
    livery: l.id,
  })),
);

/**
 * HUD accents, drawn from the palette the game already uses, so a bought HUD
 * looks designed rather than recoloured. The default green is not for sale: it
 * is what he starts with.
 */
const HUD: ShopItem[] = [
  {
    id: "hud.amber", name: "Amber HUD", cost: PRICE.hud, kind: "hud", value: "lock",
    blurb: "Warm amber instruments, the way older jets lit their dials.",
  },
  {
    id: "hud.ice", name: "Ice HUD", cost: PRICE.hud, kind: "hud", value: "shield",
    blurb: "Cold blue instruments. Easiest to read over desert ground.",
  },
  {
    id: "hud.red", name: "Night HUD", cost: PRICE.hud, kind: "hud", value: "alert",
    blurb: "Red instruments, which is what a crew uses to keep their night vision.",
  },
];

/** Lock reticles. All three are drawn in code, so all three look native. */
const RETICLES: ShopItem[] = [
  {
    id: "reticle.brackets", name: "Bracket lock", cost: PRICE.reticle, kind: "reticle", value: "brackets",
    blurb: "Four corner brackets closing on the target.",
  },
  {
    id: "reticle.pipper", name: "Pipper lock", cost: PRICE.reticle, kind: "reticle", value: "pipper",
    blurb: "A gunsight ring with a centre dot.",
  },
  {
    id: "reticle.diamond", name: "Diamond lock", cost: PRICE.reticle, kind: "reticle", value: "diamond",
    blurb: "A diamond box, the way a radar track is called out.",
  },
];

export const SHOP: ShopItem[] = [...LIVERIES, ...HUD, ...RETICLES];

export const shopItem = (id: string): ShopItem | null =>
  SHOP.find((i) => i.id === id) ?? null;

export const itemsOfKind = (kind: ShopKind): ShopItem[] =>
  SHOP.filter((i) => i.kind === kind);

/** What a livery costs is also what unlocks wearing it on the Profile screen. */
export const liveryItemId = (airframe: string, livery: string): string =>
  `livery.${airframe}.${livery}`;
