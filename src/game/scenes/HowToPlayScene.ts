// HP1-HP6 How to Play cards. Copy is lifted from the Learning Support artboards
// so the rules the player reads are the rules the engine runs.
//
// One correction to the artboard text: HP5 describes ONLINE as "70% or better
// first-try over the last 10". The engine scores a weighted blend of accuracy,
// fluency and transfer, reweighted on 2026-09-28 so accuracy dominates (see
// docs/DECISIONS.md). The card states what that blend actually comes to, in
// answers rather than in score, because a card that quotes a number the game
// does not use is worse than no card.

import Phaser from "phaser";
import { C, N, SIZE, TEXT, TRACK, CANVAS, SCREEN_PAD, STROKE, HIT, hex } from "../../ui/tokens";
import { panel, capsLabel, button, statusPill } from "../ui/kit";
import type { SystemsStatus } from "../../engine/types";

interface Row {
  key: string;
  text: string;
  accent?: string;
}

interface Card {
  id: string;
  title: string;
  lead?: string;
  rows: Row[];
  footer?: string;
  /** render the four status pills under the rows */
  showPills?: boolean;
}

const CARDS: Card[] = [
  {
    id: "HP1",
    title: "CONTROLS",
    lead: "Keyboard first. On a tablet, the next card covers touch controls.",
    rows: [
      { key: "W A S D", text: "Steer · or the arrow keys" },
      { key: "SPACE", text: "Lock the nearest bogey" },
      { key: "0–9 ·", text: "Type an answer" },
      { key: "1–N", text: "Pick an option" },
      { key: "ENTER", text: "Fire · confirm" },
      { key: "H · M", text: "Hint · Manual" },
      { key: "ESC", text: "Pause" },
    ],
    footer: "SPACE · OR THE ON-SCREEN LOCK BUTTON ON TOUCH · KEYPAD ON BY DEFAULT FOR TOUCH DEVICES",
  },
  {
    id: "HP-TOUCH",
    title: "TOUCH CONTROLS",
    lead: "On a tablet, fly with the on-screen controls. A keyboard still works if one is attached.",
    rows: [
      { key: "◀ ▶", text: "Hold to steer" },
      { key: "LOCK", text: "Tap when a bogey is in range" },
      { key: "PAUSE", text: "The two bars, top right" },
      { key: "ANSWERS", text: "Tap an option · type on the on-screen keypad" },
      { key: "MANUAL · HINT", text: "Tap the words on the problem card" },
      { key: "DRAG", text: "Scroll a manual page" },
    ],
  },
  {
    id: "HP2",
    title: "HUD LEGEND",
    rows: [
      { key: "ALT · SPD", text: "Altitude in feet and speed in knots. Some problems read these live." },
      { key: "HDG", text: "Heading tape. 087 means just north of east." },
      { key: "STREAK", text: "Counts first-try hits in a row. The timer is the sortie clock." },
      { key: "FUEL", text: "Drains with time. An empty tank ends the sortie." },
      { key: "SHLD", text: "Shields drop 20% on each miss. Both refill in briefing." },
      { key: "AIM", text: "Missiles: one per lock." },
    ],
  },
  {
    id: "HP3",
    title: "TARGET LOCK RULES",
    rows: [
      { key: "A LOCK COSTS", text: "One missile. Time freezes while the problem card is up, so a lock never costs fuel or shield by itself.", accent: C.text },
      { key: "A FAST ANSWER", text: "Answer inside the ring (5 seconds) for ×1.5 credits and streak +1.", accent: C.hud },
      { key: "A WRONG ANSWER", text: "Shields −20%. The lock breaks and your streak resets. Fuel, missiles and credits are untouched.", accent: C.alert },
      { key: "RETRY", text: "The same problem comes straight back. Retry is free and unlimited; it just cannot earn the fast bonus.", accent: C.lock },
    ],
  },
  {
    id: "HP4",
    title: "BRIEFING & RESOURCES",
    lead: "Every sortie starts with a briefing: two or three prep problems, untimed, no shield risk. Each correct answer loads a resource you fly with.",
    rows: [
      { key: "FUEL", text: "Fuel problem → tank. Drains with sortie time. An empty tank ends the sortie.", accent: C.hud },
      { key: "SHLD", text: "Systems-check problem → shields. Each miss in flight takes 20%.", accent: C.shield },
      { key: "AIM", text: "Loadout problem → missiles. One per lock.", accent: C.lock },
    ],
    footer: "SKIP A PREP AND FLY WITH LESS · MANUAL AND HINT ARE FREE HERE",
  },
  {
    id: "HP5",
    title: "SYSTEMS, RANKS & UNLOCKS",
    rows: [
      { key: "OFFLINE", text: "Not seen yet: fewer than three attempts." },
      { key: "CALIBRATING", text: "Seen, but not steady yet." },
      { key: "ONLINE", text: "8 of your last 10 right, or 9 of 10 if you are taking your time. Getting it right counts for more than getting it fast." },
      { key: "OPTIMIZED", text: "Nearly everything right, quickly, plus two transfer problems correct." },
    ],
    showPills: true,
    footer: "RANKS COME FROM MASTERED SKILLS: CADET · 2ND LT · CAPTAIN · MAJOR · COLONEL · INTEL CARDS ARE REAL FACTS ABOUT EACH AIRCRAFT, TEN PER AIRFRAME. A SORTIE WITH 6+ FIRST-TRY HITS EARNS ONE.",
  },
  {
    id: "HP6",
    title: "FLIGHT MANUAL",
    lead: "Opening it is never a penalty. One page per skill: what it is, how to solve it, a worked example in flight terms, common mistakes, a free practice problem, and where it shows up.",
    rows: [
      { key: "IN A LOCK", text: "Timer pauses · lock held · fast bonus forfeited · no shield cost", accent: C.hud },
      { key: "IN BRIEFING", text: "Side panel · no cost", accent: C.hud },
      { key: "IN DEBRIEF", text: "REVIEW opens the page for a skill you just flew", accent: C.hud },
      { key: "AFTER A QUICK MISS", text: "The worked example pops in, then you retry", accent: C.lock },
    ],
    footer: "M ON EVERY PROBLEM CARD · FLIGHT MANUAL IN THE HANGAR TOP BAR AND PAUSE MENU",
  },
];

const PILLS: SystemsStatus[] = ["OFFLINE", "CALIBRATING", "ONLINE", "OPTIMIZED"];

export class HowToPlayScene extends Phaser.Scene {
  private index = 0;
  /** the scene to return to when the player is done */
  private returnTo = "Hangar";
  private returnData: object = {};
  /** overlay mode: hand control back to a paused host instead of returnTo */
  private resumeTo?: string;
  private resumeData?: object;
  private page?: Phaser.GameObjects.Container;
  private dots: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super("HowToPlay");
  }

  init(data: { returnTo?: string; returnData?: object; index?: number; resumeTo?: string; resumeData?: object }): void {
    this.returnTo = data.returnTo ?? "Hangar";
    this.returnData = data.returnData ?? {};
    this.index = data.index ?? 0;
    this.resumeTo = data.resumeTo;
    this.resumeData = data.resumeData;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(N.ground);
    this.chrome();
    this.render();

    this.input.keyboard?.on("keydown-RIGHT", () => this.go(1));
    this.input.keyboard?.on("keydown-LEFT", () => this.go(-1));
    this.input.keyboard?.on("keydown-ESC", () => this.done());
  }

  private chrome(): void {
    const title = this.add.text(SCREEN_PAD, 14, "HOW TO PLAY", { ...TEXT.h3 });
    title.setLetterSpacing(TRACK.display * SIZE.h3);

    const rule = this.add.graphics();
    rule.lineStyle(STROKE.hairline, hex(C.border), 1);
    rule.lineBetween(SCREEN_PAD, 58, CANVAS.width - SCREEN_PAD, 58);

    button(this, {
      x: CANVAS.width - SCREEN_PAD - HIT.min,
      y: 10,
      width: HIT.min,
      label: "✕",
      variant: "ghost",
      onClick: () => this.done(),
    });

    // paging dots
    const dotY = CANVAS.height - 86;
    const gap = 18;
    const startX = (CANVAS.width - (CARDS.length - 1) * gap) / 2;
    CARDS.forEach((_, i) => {
      const g = this.add.graphics();
      g.setPosition(startX + i * gap, dotY);
      this.dots.push(g);
    });

    button(this, {
      x: SCREEN_PAD, y: CANVAS.height - 68, width: 200, label: "◀ PREV",
      variant: "ghost", onClick: () => this.go(-1),
    });
    button(this, {
      x: CANVAS.width - SCREEN_PAD - 200, y: CANVAS.height - 68, width: 200, label: "NEXT ▶",
      variant: "secondary", onClick: () => this.go(1),
    });
  }

  private go(delta: number): void {
    const next = this.index + delta;
    if (next < 0 || next >= CARDS.length) {
      if (next >= CARDS.length) this.done();
      return;
    }
    this.index = next;
    this.render();
  }

  private done(): void {
    if (this.resumeTo) {
      this.scene.stop();
      this.scene.start(this.resumeTo, this.resumeData);
      return;
    }
    this.scene.start(this.returnTo, this.returnData);
  }

  private render(): void {
    this.page?.destroy(true);
    const card = CARDS[this.index]!;
    const items: Phaser.GameObjects.GameObject[] = [];

    const x = SCREEN_PAD;
    const y = 76;
    const w = CANVAS.width - SCREEN_PAD * 2;
    const h = CANVAS.height - y - 110;
    items.push(panel(this, x, y, w, h, { fill: C.panel }));

    const code = capsLabel(this, x + 20, y + 16, `${card.id} · ${this.index + 1} OF ${CARDS.length}`, C.textMuted, TRACK.readout);
    items.push(code);

    const title = this.add.text(x + 20, y + 16 + SIZE.label + 6, card.title, { ...TEXT.h2 });
    title.setLetterSpacing(TRACK.display * SIZE.h2);
    items.push(title);

    let cursor = title.y + title.height + 12;
    if (card.lead) {
      const lead = this.add.text(x + 20, cursor, card.lead, {
        ...TEXT.bodyLg, color: C.textMuted, wordWrap: { width: w - 40 }, lineSpacing: 3,
      });
      items.push(lead);
      cursor += lead.height + 14;
    }

    for (const row of card.rows) {
      const key = capsLabel(this, x + 20, cursor + 2, row.key, row.accent ?? C.hud);
      const text = this.add.text(x + 220, cursor, row.text, {
        ...TEXT.body, wordWrap: { width: w - 260 }, lineSpacing: 2,
      });
      items.push(key, text);
      cursor += Math.max(text.height, SIZE.label) + 10;
    }

    if (card.showPills) {
      cursor += 4;
      let px = x + 20;
      for (const status of PILLS) {
        const pill = statusPill(this, px, cursor, status);
        items.push(pill);
        px += pill.width + 12;
      }
      cursor += 34;
    }

    if (card.footer) {
      const footer = capsLabel(this, x + 20, y + h - 20 - SIZE.label, card.footer, C.textMuted, TRACK.readout);
      footer.setWordWrapWidth(w - 40);
      footer.setY(y + h - 16 - footer.height);
      items.push(footer);
    }

    this.page = this.add.container(0, 0, items);
    this.paint();
  }

  private paint(): void {
    this.dots.forEach((g, i) => {
      g.clear();
      if (i === this.index) {
        g.fillStyle(hex(C.hud), 1);
        g.fillCircle(0, 0, 4);
      } else {
        g.lineStyle(STROKE.hairline, hex(C.border), 1);
        g.strokeCircle(0, 0, 4);
      }
    });
  }
}
