// The hangar shop: what credits are finally for.
//
// Credits had exactly one sink, HINT at 50, so twenty sorties in he was sitting
// on thousands of them with nothing to want. src/data/shop.ts holds the
// catalogue and the rule it lives by: this sells looks and never advantage,
// because the moment credits buy a shield the fastest route to the reward is to
// stop thinking.
//
// Liveries are bought here and worn on the Profile screen, which is where the
// aircraft already are. Everything else is bought and worn in one press.

import Phaser from "phaser";
import { C, N, SIZE, TEXT, TRACK, CANVAS, SCREEN_PAD, STROKE, HIT, hex } from "../../ui/tokens";
import { panel, capsLabel, button } from "../ui/kit";
import { SHOP, itemsOfKind, type ShopItem, type ShopKind } from "../../data/shop";
import { buyItem, equip, owns } from "../save";
import { gameState } from "../state";
import { audio } from "../audio";

const TABS: { kind: ShopKind; label: string; note: string }[] = [
  { kind: "livery", label: "PAINT", note: "Wear it on the PILOT screen once it is yours." },
  { kind: "hud", label: "HUD", note: "The colour of every instrument in the cockpit." },
  { kind: "reticle", label: "RETICLE", note: "The lock that closes on a contact." },
];

const CARD_W = 384;
const CARD_H = 132;
const GAP = 16;

export class ShopScene extends Phaser.Scene {
  private tab: ShopKind = "livery";

  constructor() {
    super("Shop");
  }

  create(): void {
    this.cameras.main.setBackgroundColor(N.ground);
    this.draw();
  }

  /** Redrawn whole after every purchase: the screen is small and state is global. */
  private redraw(): void {
    this.children.removeAll();
    this.draw();
  }

  private draw(): void {
    const title = this.add.text(SCREEN_PAD, 14, "SHOP", { ...TEXT.h3 });
    title.setLetterSpacing(TRACK.display * SIZE.h3);

    const credits = capsLabel(this, SCREEN_PAD + 110, 22, `${gameState.file.credits} CR`, C.lock, TRACK.readout);
    void credits;

    const owned = SHOP.filter((i) => owns(gameState.file, i.id)).length;
    const count = capsLabel(this, SCREEN_PAD + 240, 22, `${owned} OF ${SHOP.length} OWNED`, C.textMuted, TRACK.readout);
    void count;

    button(this, {
      x: CANVAS.width - SCREEN_PAD - 120, y: 12, width: 120, height: HIT.min,
      label: "BACK", variant: "ghost", onClick: () => this.leave(),
    });

    const rule = this.add.graphics();
    rule.lineStyle(STROKE.hairline, hex(C.border), 1);
    rule.lineBetween(SCREEN_PAD, 58, CANVAS.width - SCREEN_PAD, 58);

    this.tabs(74);
    this.grid(140);

    const hint = capsLabel(this, 0, CANVAS.height - 30,
      "NOTHING HERE CHANGES THE MATHS · LOOKS ONLY", C.textMuted, TRACK.readout);
    hint.setX((CANVAS.width - hint.width) / 2);

    this.input.keyboard?.once("keydown-ESC", () => this.leave());
  }

  private leave(): void {
    audio.play("uiBack");
    this.scene.start("Hangar");
  }

  private tabs(y: number): void {
    let x = SCREEN_PAD;
    for (const t of TABS) {
      const on = this.tab === t.kind;
      const b = button(this, {
        x, y, width: 150, height: HIT.min,
        label: t.label,
        variant: on ? "primary" : "ghost",
        onClick: () => { this.tab = t.kind; audio.play("uiMove"); this.redraw(); },
      });
      void b;
      x += 150 + 12;
    }

    const note = TABS.find((t) => t.kind === this.tab)!.note;
    const n = capsLabel(this, x + 12, y + 14, note, C.textMuted, TRACK.readout);
    void n;
  }

  private grid(top: number): void {
    const items = itemsOfKind(this.tab);
    const cols = 3;

    items.forEach((item, i) => {
      const x = SCREEN_PAD + (i % cols) * (CARD_W + GAP);
      const y = top + Math.floor(i / cols) * (CARD_H + GAP);
      this.card(x, y, item);
    });

    if (items.length === 0) {
      const empty = capsLabel(this, SCREEN_PAD, top + 20, "NOTHING IN STOCK", C.textMuted, TRACK.readout);
      void empty;
    }
  }

  private card(x: number, y: number, item: ShopItem): void {
    const mine = owns(gameState.file, item.id);
    const worn = this.isWorn(item);
    const afford = gameState.file.credits >= item.cost;

    panel(this, x, y, CARD_W, CARD_H, {
      fill: C.panel,
      border: worn ? C.hud : mine ? C.border : C.gridLine,
    });

    const name = this.add.text(x + 16, y + 14, item.name, { ...TEXT.h3, fontSize: "17px" });
    void name;

    const blurb = this.add.text(x + 16, y + 40, item.blurb, {
      ...TEXT.body, color: C.textMuted, fontSize: "13px",
      wordWrap: { width: CARD_W - 32 }, lineSpacing: 2,
    });
    void blurb;

    // Price, or what it already is to him.
    const tag = mine
      ? capsLabel(this, x + 16, y + CARD_H - 30, worn ? "WORN" : "OWNED", worn ? C.hud : C.textMuted, TRACK.readout)
      : capsLabel(this, x + 16, y + CARD_H - 30, `${item.cost} CR`, afford ? C.lock : C.textMuted, TRACK.readout);
    void tag;

    // A livery is bought here and worn on the Profile screen, where the
    // aircraft already is; the other kinds are worn in the same press.
    const label = !mine ? "BUY" : item.kind === "livery" ? "OWNED" : worn ? "TAKE OFF" : "WEAR";
    const variant = !mine ? (afford ? "primary" : "disabled")
      : item.kind === "livery" ? "disabled"
        : worn ? "secondary" : "ghost";

    button(this, {
      x: x + CARD_W - 16 - 130, y: y + CARD_H - 16 - HIT.min, width: 130, height: HIT.min,
      label, variant,
      onClick: () => this.press(item, mine, worn),
    });
  }

  private isWorn(item: ShopItem): boolean {
    if (item.kind === "hud") return gameState.file.hud === item.id;
    if (item.kind === "reticle") return gameState.file.reticle === item.id;
    return false;
  }

  private press(item: ShopItem, mine: boolean, worn: boolean): void {
    if (!mine) {
      const before = gameState.file.credits;
      const next = buyItem(gameState.file, item.id, item.cost);
      // buyItem refuses quietly when it cannot be afforded, so the sound has to
      // follow what actually happened rather than what was pressed.
      if (next.credits === before) { audio.play("miss"); return; }
      gameState.update(next);
      audio.play("intelCard");
      this.redraw();
      return;
    }

    if (item.kind === "livery") return;
    const slot = item.kind === "hud" ? "hud" : "reticle";
    gameState.update(equip(gameState.file, slot, worn ? "" : item.id));
    audio.play("uiConfirm");
    this.redraw();
  }
}
