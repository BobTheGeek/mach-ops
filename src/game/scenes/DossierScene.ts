// 08 Intel dossier and 08B empty state. Ten cards per airframe; a sortie with
// six or more first-try hits earns the next one.

import Phaser from "phaser";
import { C, N, SIZE, TEXT, TRACK, CANVAS, SCREEN_PAD, STROKE, hex } from "../../ui/tokens";
import { panel, capsLabel, button } from "../ui/kit";
import { gameState } from "../state";
import { dossier, CARDS_PER_AIRFRAME, FIRST_TRY_HITS_FOR_CARD } from "../../data/intel";

export class DossierScene extends Phaser.Scene {
  private airframe = "t38";

  constructor() {
    super("Dossier");
  }

  init(data: { airframe?: string }): void {
    this.airframe = data.airframe ?? gameState.currentAirframe();
  }

  create(): void {
    this.cameras.main.setBackgroundColor(N.ground);
    const d = dossier(this.airframe);

    const title = this.add.text(SCREEN_PAD, 14, "DOSSIER", { ...TEXT.h3 });
    title.setLetterSpacing(TRACK.display * SIZE.h3);

    const rule = this.add.graphics();
    rule.lineStyle(STROKE.hairline, hex(C.border), 1);
    rule.lineBetween(SCREEN_PAD, 58, CANVAS.width - SCREEN_PAD, 58);

    button(this, {
      x: SCREEN_PAD,
      y: CANVAS.height - 68,
      width: 180,
      label: "HANGAR",
      variant: "ghost",
      onClick: () => this.scene.start("Hangar"),
    });

    if (!d) {
      // 08B: an airframe with no dossier written yet.
      const empty = this.add.text(SCREEN_PAD, 120, "NO INTEL YET", { ...TEXT.h2, color: C.textMuted });
      const copy = this.add.text(SCREEN_PAD, 180,
        `Ten cards unlock as you fly the ${this.airframe.toUpperCase()}.`,
        { ...TEXT.bodyLg, color: C.textMuted, wordWrap: { width: 640 } });
      void empty;
      void copy;
      return;
    }

    const name = capsLabel(this, SCREEN_PAD + 160, 22, `${d.designation} ${d.name}`, C.hud, TRACK.readout);
    void name;

    this.specs(d);
    this.cards(d);
  }

  private specs(d: NonNullable<ReturnType<typeof dossier>>): void {
    const x = SCREEN_PAD;
    const y = 76;
    const w = 340;
    panel(this, x, y, w, 300, { fill: C.panel });

    if (this.textures.exists(`${this.airframe}-side`)) {
      this.add.image(x + w / 2, y + 60, `${this.airframe}-side`).setDisplaySize(280, 104);
    }

    const rows: [string, string][] = [
      ["LENGTH", `${d.lengthM.toFixed(1)} M`],
      ["SPAN", `${d.spanM.toFixed(1)} M`],
      ["HEIGHT", `${d.heightM.toFixed(1)} M`],
      ["ENGINE", d.engine],
      ["TOP SPEED", d.topSpeed],
      ["CREW", String(d.crew)],
    ];
    rows.forEach(([label, value], i) => {
      const ry = y + 128 + i * 28;
      const l = capsLabel(this, x + 16, ry, label, C.textMuted, TRACK.readout);
      const v = this.add.text(x + 160, ry - 3, value, { ...TEXT.value, fontSize: "16px" });
      void l;
      void v;
    });
  }

  private cards(d: NonNullable<ReturnType<typeof dossier>>): void {
    const owned = new Set(gameState.file.intelCards[this.airframe] ?? []);
    const x = SCREEN_PAD + 372;
    const y = 76;
    const w = CANVAS.width - x - SCREEN_PAD;

    const head = capsLabel(this, x, y, `INTEL CARDS · ${owned.size} OF ${CARDS_PER_AIRFRAME}`, C.hud);
    void head;

    const rule = capsLabel(this, 0, y,
      `EACH SORTIE WITH ${FIRST_TRY_HITS_FOR_CARD}+ FIRST-TRY HITS EARNS ONE CARD`, C.textMuted, TRACK.readout);
    rule.setX(CANVAS.width - SCREEN_PAD - rule.width);

    const cols = 2;
    const gap = 12;
    const cw = (w - gap) / cols;
    const ch = 92;

    d.cards.forEach((card, i) => {
      const cx = x + (i % cols) * (cw + gap);
      const cy = y + 32 + Math.floor(i / cols) * (ch + gap);
      const have = owned.has(card.n);

      panel(this, cx, cy, cw, ch, {
        fill: have ? C.panelRaised : C.panel,
        border: have ? C.border : C.gridLine,
      });

      const label = capsLabel(this, cx + 12, cy + 10, have ? card.title : "LOCKED",
        have ? C.lock : C.textMuted, TRACK.readout);
      void label;

      const num = capsLabel(this, 0, cy + 10, String(card.n).padStart(2, "0"), C.textMuted, TRACK.readout);
      num.setX(cx + cw - 12 - num.width);

      const body = this.add.text(cx + 12, cy + 10 + SIZE.label + 6,
        have ? card.body : `Sortie ${String(card.n).padStart(2, "0")}`,
        {
          ...TEXT.body,
          fontSize: "14px",
          color: have ? C.text : C.textMuted,
          wordWrap: { width: cw - 24 },
          lineSpacing: 1,
        });
      void body;
    });
  }
}
