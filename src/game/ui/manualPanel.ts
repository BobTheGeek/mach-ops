// Flight Manual side panel, M4 (from a sortie, lock paused) and M5 (from a
// briefing, beside the prep problem).
//
// docs/design.md principle 2: "Learning is never punished." Opening the manual
// holds the lock, pauses the timer, forfeits the fast bonus and costs no shield;
// the panel says so in the header rather than leaving the player to guess.

import Phaser from "phaser";
import { C, N, SIZE, FONT, TEXT, TRACK, RADIUS, STROKE, HIT, hex, CANVAS, SCREEN_PAD } from "../../ui/tokens";
import { panel, capsLabel, button, statusPill, dim } from "./kit";
import { renderFigure, SLOT_H } from "./figures";
import { loadPage, type ManualPage } from "../manual";
import { generatorFor } from "../../generators/index";
import type { SystemsStatus, Tier, Problem } from "../../engine/types";

export const PANEL_W = 520;
const PAD = 16;
const BLOCK_GAP = 12;

export interface ManualPanelOpts {
  scene: Phaser.Scene;
  skill: string;
  tier: Tier;
  status: SystemsStatus;
  /** the line under the title explaining what opening this costs */
  costNote: string;
  onClose: () => void;
}

export class ManualPanel {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly page: ManualPage;
  private readonly opts: ManualPanelOpts;
  private worked: Problem;
  private scroll = 0;
  private body!: Phaser.GameObjects.Container;
  private bodyHeight = 0;
  private keyHandler?: (e: KeyboardEvent) => void;

  constructor(opts: ManualPanelOpts) {
    this.scene = opts.scene;
    this.opts = opts;
    this.page = loadPage(opts.skill);
    // The worked example is generated live at the player's tier, from the same
    // code path the fast-wrong pop-in uses.
    this.worked = generatorFor(opts.skill)(opts.tier, Date.now() % 100000);

    const scrim = dim(this.scene);
    scrim.on("pointerup", () => this.close());

    this.container = this.scene.add.container(0, 0, [scrim]);
    this.build();
    this.attachKeys();
  }

  private build(): void {
    const s = this.scene;
    const x = CANVAS.width - PANEL_W;
    const h = CANVAS.height;

    const frame = panel(s, x, 0, PANEL_W, h, { fill: C.panel, border: C.border, radius: 0 });
    this.container.add(frame);

    let y = SCREEN_PAD - 8;
    const label = capsLabel(s, x + PAD, y, "FLIGHT MANUAL", C.hud);
    y += SIZE.label + 10;

    const divider = s.add.graphics();
    divider.lineStyle(STROKE.hairline, hex(C.border), 1);
    divider.lineBetween(x + PAD, y, x + PAD + 36, y);
    y += 12;

    const title = s.add.text(x + PAD, y, this.page.title, { ...TEXT.h3, wordWrap: { width: PANEL_W - PAD * 2 - 60 } });
    y += title.height + 6;

    // Four standards run past the status pill, so the codes wrap in the space
    // to its left rather than being drawn straight through it.
    const pill = statusPill(s, x + PANEL_W - PAD - 130, y - 4, this.opts.status);
    const codes = s.add.text(x + PAD, y, this.page.standards.join(" · ").toUpperCase(), {
      ...TEXT.label, color: C.textMuted, wordWrap: { width: PANEL_W - PAD * 2 - 140 }, lineSpacing: 2,
    });
    codes.setLetterSpacing(TRACK.readout * SIZE.label);
    y += Math.max(SIZE.label + 10, codes.height + 8);

    // What opening this costs, stated plainly. It wraps: the sortie note is long
    // and must never be clipped, because the whole point is that the player can
    // read what it costs before deciding.
    const cost = s.add.text(x + PAD, y, this.opts.costNote, {
      ...TEXT.label,
      color: C.hud,
      wordWrap: { width: PANEL_W - PAD * 2 },
      lineSpacing: 2,
    });
    y += cost.height + 12;

    const close = button(s, {
      x: x + PANEL_W - PAD - HIT.min,
      y: SCREEN_PAD - 12,
      width: HIT.min,
      label: "✕",
      variant: "ghost",
      onClick: () => this.close(),
    });

    this.container.add([label, divider, title, codes, pill, cost, close.container]);

    // scrollable body
    const bodyTop = y;
    this.body = s.add.container(x + PAD, bodyTop);
    this.bodyOriginY = bodyTop;
    this.buildBody(PANEL_W - PAD * 2);
    this.container.add(this.body);

    const maskShape = s.make.graphics({});
    maskShape.fillRect(x, bodyTop, PANEL_W, h - bodyTop - 56);
    this.body.setMask(maskShape.createGeometryMask());

    const hint = capsLabel(s, x + PAD, h - 36, "↑ ↓ SCROLL   ESC · CLOSE", C.textMuted, TRACK.readout);
    this.container.add(hint);
  }

  private block(heading: string, accent: string): { g: Phaser.GameObjects.Graphics; title: Phaser.GameObjects.Text } {
    const g = this.scene.add.graphics();
    const title = capsLabel(this.scene, 14, 12, heading, accent);
    return { g, title };
  }

  private buildBody(w: number): void {
    const s = this.scene;
    let y = 0;

    const addBlock = (heading: string, accent: string, draw: (top: number, inner: number) => number): void => {
      const { g, title } = this.block(heading, accent);
      const contentTop = y + 12 + SIZE.label + 8;
      const used = draw(contentTop, w - 28);
      const h = used - y + 14;
      g.fillStyle(N.panelRaised, 1);
      g.fillRoundedRect(0, y, w, h, RADIUS.panel);
      g.lineStyle(STROKE.hairline, hex(C.border), 1);
      g.strokeRoundedRect(0, y, w, h, RADIUS.panel);
      title.setPosition(14, y + 12);
      this.body.add(g);
      this.body.sendToBack(g);
      this.body.add(title);
      y += h + BLOCK_GAP;
    };

    // 1. What it is
    addBlock("WHAT IT IS", C.hud, (top, inner) => {
      const t = s.add.text(14, top, stripMd(this.page.blocks["What it is"]), {
        ...TEXT.body, wordWrap: { width: inner }, lineSpacing: 4,
      });
      this.body.add(t);
      return top + t.height;
    });

    // 2. How to solve it, with the 180 px diagram slot
    addBlock("HOW TO SOLVE IT", C.hud, (top, inner) => {
      let cursor = top;
      this.page.steps.forEach((step, i) => {
        const t = s.add.text(14, cursor, `${i + 1}.  ${stripMd(step)}`, {
          ...TEXT.body, wordWrap: { width: inner }, lineSpacing: 3,
        });
        this.body.add(t);
        cursor += t.height + 6;
      });

      // Only reserve the 180 px slot when there is something to draw in it.
      // A skill whose figure kind has no renderer yet was getting a large empty
      // box between the steps and the worked example.
      const fig = renderFigure(s, this.worked.prompt.figure, inner, SLOT_H);
      if (!fig) return cursor;

      const slot = s.add.graphics();
      slot.lineStyle(STROKE.hairline, hex(C.shield), 0.6);
      slot.strokeRoundedRect(14, cursor + 4, inner, SLOT_H, RADIUS.panel);
      this.body.add(slot);
      fig.setPosition(14, cursor + 4);
      this.body.add(fig);
      return cursor + 4 + SLOT_H;
    });

    // 3. Worked example, generated live
    addBlock("WORKED EXAMPLE  ↻ GENERATED", C.hud, (top, inner) => {
      let cursor = top;
      const prompt = s.add.text(14, cursor, this.worked.prompt.text, {
        ...TEXT.body, color: C.textMuted, wordWrap: { width: inner }, lineSpacing: 3,
      });
      this.body.add(prompt);
      cursor += prompt.height + 8;

      this.worked.worked.forEach((step, i) => {
        const t = s.add.text(14, cursor, `${i + 1}.  ${step.text}`, {
          ...TEXT.body, wordWrap: { width: inner }, lineSpacing: 3,
        });
        this.body.add(t);
        cursor += t.height + 2;
        if (step.math) {
          const m = s.add.text(28, cursor, step.math, {
            fontFamily: FONT.mono, fontSize: `${SIZE.number}px`, color: C.shield,
          });
          this.body.add(m);
          cursor += m.height + 6;
        }
      });
      return cursor;
    });

    // 4. Watch out for: amber, left-rule cards
    addBlock("WATCH OUT FOR", C.lock, (top, inner) => {
      let cursor = top;
      for (const w of this.page.watchOut) {
        const rule = s.add.graphics();
        const t = s.add.text(24, cursor, `${stripMd(w.mistake)}\n→ ${stripMd(w.fix)}`, {
          ...TEXT.body, wordWrap: { width: inner - 14 }, lineSpacing: 3,
        });
        rule.fillStyle(hex(C.lock), 1);
        rule.fillRect(14, cursor, 2, t.height);
        this.body.add([rule, t]);
        cursor += t.height + 10;
      }
      return cursor;
    });

    // 5. Where it shows up
    addBlock("WHERE IT SHOWS UP", C.hud, (top, inner) => {
      const t = s.add.text(14, top, stripMd(this.page.blocks["Where it shows up"]), {
        ...TEXT.body, color: C.textMuted, wordWrap: { width: inner }, lineSpacing: 4,
      });
      this.body.add(t);
      return top + t.height;
    });

    this.bodyHeight = y;
  }

  private attachKeys(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "m" || e.key === "M") { e.preventDefault(); this.close(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); this.scrollBy(40); }
      if (e.key === "ArrowUp") { e.preventDefault(); this.scrollBy(-40); }
    };
    window.addEventListener("keydown", this.keyHandler, true);

    this.scene.input.on("wheel", (_p: unknown, _o: unknown, _dx: number, dy: number) => this.scrollBy(dy * 0.5));
  }

  private bodyOriginY = 0;

  private scrollBy(dy: number): void {
    const visible = CANVAS.height - this.bodyOriginY - 56;
    const max = Math.max(0, this.bodyHeight - visible);
    this.scroll = Phaser.Math.Clamp(this.scroll + dy, 0, max);
    this.body.setY(this.bodyOriginY - this.scroll);
  }

  private close(): void {
    this.opts.onClose();
    this.destroy();
  }

  destroy(): void {
    if (this.keyHandler) window.removeEventListener("keydown", this.keyHandler, true);
    this.scene.input.off("wheel");
    this.container.destroy(true);
  }
}

/** Strip the markdown the panel does not render: bold markers and links. */
function stripMd(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/^- /gm, "• ")
    .trim();
}
