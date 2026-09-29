// The problem card (Component Library 02) and the answer inputs it hosts.
//
// design/README.md: 400-640 px wide, #0D1520, 1 px border (#223347 default,
// #F5B841 during lock, #86F0A3 briefing), radius 8, padding 20, gap 12-14,
// shadow. Header row 14 px mono caps amber (skill · chapter · multiplier ·
// timer). Prompt 16-18 px Plex Sans. Input 44 px tall, 1 px green border,
// 20-24 px mono value with a green caret. Footer 14 px muted.
//
// Chapter 1 needs three of the eight inputs: typed entry (numeric / fraction),
// AI-6 pick one of N, and AI-7 reorder.

import Phaser from "phaser";
import { C, N, SIZE, FONT, TEXT, TRACK, RADIUS, STROKE, HIT, INPUT, hex } from "../../ui/tokens";
import { panel, capsLabel } from "./kit";
import { renderFigure } from "./figures";
import { parseRational, fmtFraction, MINUS } from "../../engine/rational";
import { audio } from "../audio";
import type { Problem } from "../../engine/types";

export type CardMode = "lock" | "briefing";
export type CardState = "default" | "correct" | "wrong";

export const CARD_W = 560;
export const PAD = 20;
export const GAP = 14;
export const FIGURE_W = 240;
export const FIGURE_H = 140;

export interface CommitResult {
  correct: boolean;
  /** exactly what the player entered or picked, already formatted */
  given: string;
  /** the registry error tag their wrong answer maps to, when it maps to one */
  errorTag?: string;
}

export interface ProblemCardOpts {
  scene: Phaser.Scene;
  problem: Problem;
  mode: CardMode;
  chapterLabel: string;
  /** shown in the header; "x1.5" while the fast window is open */
  multiplier?: string;
  onCommit: (r: CommitResult) => void;
  onManual: () => void;
  onHint: () => void;
  /** hints are free in briefings, 50 credits in sorties */
  hintCost: number;
}

export class ProblemCard {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly problem: Problem;
  private readonly opts: ProblemCardOpts;

  private frame!: Phaser.GameObjects.Graphics;
  private header!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private feedback!: Phaser.GameObjects.Text;
  private height = 0;
  private locked = false;

  /** typed entry */
  private typed = "";
  private typedText?: Phaser.GameObjects.Text;
  private caret?: Phaser.GameObjects.Rectangle;
  private inputBox?: Phaser.GameObjects.Graphics;

  /** AI-6 pick one of N */
  private optionRows: { g: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; y: number; h: number }[] = [];
  private picked = -1;
  private inputX = PAD;
  private inputW = CARD_W - PAD * 2;

  /** AI-7 reorder */
  private order: number[] = [];
  private orderRows: { g: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text }[] = [];
  private cursor = 0;

  private keyHandler?: (e: KeyboardEvent) => void;

  constructor(opts: ProblemCardOpts) {
    this.scene = opts.scene;
    this.problem = opts.problem;
    this.opts = opts;
    this.container = this.scene.add.container(0, 0);
    this.build();
    this.attachKeys();
  }

  /* ------------------------------------------------------------- build */

  private get isPick(): boolean {
    return this.problem.options !== undefined && this.problem.format !== "order";
  }

  private get isOrder(): boolean {
    return this.problem.format === "order";
  }

  private build(): void {
    const s = this.scene;
    let y = PAD;

    // header: skill · chapter · multiplier, with the timer on the right
    const left = `${this.problem.skill} · ${this.opts.chapterLabel}${this.opts.multiplier ? ` · ${this.opts.multiplier}` : ""}`;
    this.header = capsLabel(s, PAD, y, left, C.lock);
    this.timerText = capsLabel(s, 0, y, "", C.lock);
    y += SIZE.label + GAP;

    // prompt
    const prompt = s.add.text(PAD, y, this.problem.prompt.text, {
      ...TEXT.bodyLg,
      wordWrap: { width: CARD_W - PAD * 2 },
      lineSpacing: 5,
    });
    y += prompt.height + GAP;

    // figure sits left of the input when there is one
    const figure = renderFigure(s, this.problem.prompt.figure, FIGURE_W, FIGURE_H);
    let inputX = PAD;
    let inputW = CARD_W - PAD * 2;
    if (figure) {
      figure.setPosition(PAD, y);
      inputX = PAD + FIGURE_W + GAP;
      inputW = CARD_W - inputX - PAD;
    }
    // Redraws must reuse this column. Deriving it from prompt.figure instead
    // put the boxes in the figure layout while the labels stayed full width,
    // for any figure kind that has a spec but no renderer yet.
    this.inputX = inputX;
    this.inputW = inputW;

    const inputTop = y;
    const inputHeight = this.isPick
      ? this.buildPickRows(inputX, inputTop, inputW)
      : this.isOrder
        ? this.buildOrderRows(inputX, inputTop, inputW)
        : this.buildTypedInput(inputX, inputTop, inputW);

    y = inputTop + Math.max(inputHeight, figure ? FIGURE_H : 0) + GAP;

    // one-line feedback ("YOU n · ANSWER n · RETRY")
    this.feedback = s.add.text(PAD, y, "", { ...TEXT.label, color: C.alert });
    y += SIZE.label + GAP;

    // footer hints
    const commitHint = capsLabel(s, PAD, y, "ENTER · COMMIT", C.textMuted, TRACK.readout);
    const helpText = this.opts.hintCost > 0
      ? `M · MANUAL   H · HINT ${MINUS}${this.opts.hintCost} CR`
      : "M · MANUAL   H · HINT";
    const helpHint = capsLabel(s, 0, y, helpText, C.textMuted, TRACK.readout);
    helpHint.setX(CARD_W - PAD - helpHint.width);
    y += SIZE.label + PAD;

    this.height = y;

    // frame goes underneath everything
    this.frame = panel(this.scene, 0, 0, CARD_W, this.height, { border: this.borderColor() });
    this.container.add([this.frame, this.header, this.timerText, prompt]);
    if (figure) this.container.add(figure);
    this.container.add([this.feedback, commitHint, helpHint]);
    this.container.sendToBack(this.frame);
    for (const r of this.optionRows) this.container.add([r.g, r.label]);
    for (const r of this.orderRows) this.container.add([r.g, r.label]);
    if (this.inputBox) this.container.add(this.inputBox);
    if (this.typedText) this.container.add(this.typedText);
    if (this.caret) this.container.add(this.caret);

    this.timerText.setX(CARD_W - PAD - this.timerText.width);
    this.fitHeader();
    this.container.setSize(CARD_W, this.height);
  }

  private borderColor(): string {
    return this.opts.mode === "lock" ? C.lock : C.hud;
  }

  /** Typed entry: 44 px tall, 1 px green border, mono value, green caret. */
  private buildTypedInput(x: number, y: number, w: number): number {
    const s = this.scene;
    this.inputBox = s.add.graphics();
    this.typedText = s.add.text(x + 12, y + (HIT.min - SIZE.h3) / 2, "", {
      fontFamily: FONT.mono,
      fontSize: `${SIZE.h3}px`,
      color: C.text,
      fontStyle: "600",
    });
    this.caret = s.add.rectangle(x + 12, y + 10, 2, HIT.min - 20, N.hud).setOrigin(0, 0);
    s.tweens.add({ targets: this.caret, alpha: 0, duration: 500, yoyo: true, repeat: -1 });
    this.drawTypedBox(x, y, w, "default");
    return HIT.min;
  }

  private drawTypedBox(x: number, y: number, w: number, state: CardState): void {
    const g = this.inputBox!;
    g.clear();
    const fill = state === "correct" ? INPUT.correctFill : state === "wrong" ? INPUT.wrongFill : null;
    if (fill) {
      g.fillStyle(hex(fill), 1);
      g.fillRoundedRect(x, y, w, HIT.min, RADIUS.input);
    }
    const ring = state === "correct" ? INPUT.correct : state === "wrong" ? INPUT.wrong : C.hud;
    g.lineStyle(state === "default" ? STROKE.hairline : INPUT.ring, hex(ring), 1);
    g.strokeRoundedRect(x, y, w, HIT.min, RADIUS.input);
  }

  /** AI-6: pick rows are 56 px, keys 1-N, option text formatted like the answer. */
  private buildPickRows(x: number, y: number, w: number): number {
    const s = this.scene;
    const texts = this.problem.optionText ?? (this.problem.options ?? []).map(String);
    const gap = 8;

    // Chapter 8 answers in sentences ("the 210 aircrew in the biggest
    // squadron"), which ran straight out of a fixed-width row. Long options
    // wrap and their row grows to fit rather than the text spilling past the
    // border.
    let cursor = y;
    texts.forEach((label, i) => {
      const g = s.add.graphics();
      const t = s.add.text(x + 16, 0, `${i + 1}   ${label}`, {
        fontFamily: FONT.mono,
        fontSize: `${SIZE.number}px`,
        color: C.text,
        wordWrap: { width: w - 32 },
        lineSpacing: 2,
      });
      const rowH = Math.max(INPUT.pickRow, t.height + 18);
      t.setY(cursor + (rowH - t.height) / 2);
      const row = { g, label: t, y: cursor, h: rowH };
      this.optionRows.push(row);
      this.drawPickRow(i, x, w, "default");

      const zone = s.add
        .zone(x, cursor, w, rowH)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      zone.on("pointerup", () => this.pick(i));
      this.container.add(zone);
      cursor += rowH + gap;
    });

    return cursor - y - gap;
  }

  /**
   * The header and the timer share one line, the first left-aligned and the
   * second right-aligned. An honors skill with a multiplier makes the left side
   * long enough to run under the timer — "HONORSUNTIMED" — so it is squeezed to
   * whatever room the timer leaves.
   */
  private fitHeader(): void {
    const room = this.timerText.x - PAD - 12;
    if (room <= 0) return;
    this.header.setScale(1);
    if (this.header.width > room) this.header.setScale(room / this.header.width);
  }

  private drawPickRow(i: number, x: number, w: number, state: CardState | "picked"): void {
    const row = this.optionRows[i];
    if (!row) return;
    const g = row.g;
    g.clear();
    const fill = state === "correct" ? INPUT.correctFill : state === "wrong" ? INPUT.wrongFill : null;
    if (fill) {
      g.fillStyle(hex(fill), 1);
      g.fillRoundedRect(x, row.y, w, row.h, RADIUS.input);
    }
    const ring =
      state === "correct" ? INPUT.correct : state === "wrong" ? INPUT.wrong : state === "picked" ? C.hud : C.border;
    g.lineStyle(state === "default" ? STROKE.hairline : INPUT.ring, hex(ring), 1);
    g.strokeRoundedRect(x, row.y, w, row.h, RADIUS.input);
  }

  /** AI-7: reorder, shuffled by default, arrow keys move the cursor and the row. */
  private buildOrderRows(x: number, y: number, w: number): number {
    const s = this.scene;
    const answer = this.problem.answer as unknown[];
    this.order = answer.map((_, i) => i);
    // Shuffle deterministically off the problem seed so a replay matches.
    for (let i = this.order.length - 1; i > 0; i--) {
      const j = (this.problem.seed + i * 31) % (i + 1);
      const tmp = this.order[i]!;
      this.order[i] = this.order[j]!;
      this.order[j] = tmp;
    }

    const rowH = HIT.min;
    const gap = 6;
    this.order.forEach((_, i) => {
      const g = s.add.graphics();
      const t = s.add.text(x + 16, y + i * (rowH + gap) + (rowH - SIZE.number) / 2, "", {
        fontFamily: FONT.mono,
        fontSize: `${SIZE.number}px`,
        color: C.text,
      });
      this.orderRows.push({ g, label: t });
    });
    this.orderX = x;
    this.orderY = y;
    this.orderW = w;
    this.redrawOrder(x, y, w);
    return this.order.length * (rowH + gap) - gap;
  }

  private orderX = PAD;
  private orderY = 0;
  private orderW = CARD_W - PAD * 2;

  private redrawOrder(x: number, y: number, w: number): void {
    const rowH = HIT.min;
    const gap = 6;
    const values = this.problem.answer as unknown[];
    this.order.forEach((valueIndex, i) => {
      const row = this.orderRows[i]!;
      const top = y + i * (rowH + gap);
      row.g.clear();
      const active = i === this.cursor;
      row.g.lineStyle(active ? INPUT.ring : STROKE.hairline, hex(active ? C.hud : C.border), 1);
      row.g.strokeRoundedRect(x, top, w, rowH, RADIUS.input);
      const labels = this.problem.orderLabels;
      const v = values[valueIndex];
      const text = labels?.[valueIndex] ?? (typeof v === "object" && v !== null && "n" in v
        ? fmtFraction(v as { n: number; d: number })
        : String(v));
      row.label.setText(`${i + 1}   ${text}`);
      row.label.setPosition(x + 16, top + (rowH - SIZE.number) / 2);
    });
  }

  /* -------------------------------------------------------------- input */

  private attachKeys(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      if (this.locked) return;
      const k = e.key;

      if (k === "Enter") { e.preventDefault(); this.commit(); return; }
      if (k === "m" || k === "M") { e.preventDefault(); this.opts.onManual(); return; }
      if (k === "h" || k === "H") { e.preventDefault(); this.opts.onHint(); return; }

      if (this.isPick) {
        const n = Number(k);
        if (Number.isInteger(n) && n >= 1 && n <= this.optionRows.length) { e.preventDefault(); this.pick(n - 1); }
        return;
      }

      if (this.isOrder) {
        if (k === "ArrowDown") { e.preventDefault(); this.cursor = Math.min(this.order.length - 1, this.cursor + 1); this.refreshOrder(); }
        if (k === "ArrowUp") { e.preventDefault(); this.cursor = Math.max(0, this.cursor - 1); this.refreshOrder(); }
        if (k === "ArrowLeft" || k === "ArrowRight") {
          e.preventDefault();
          const to = k === "ArrowLeft" ? this.cursor - 1 : this.cursor + 1;
          if (to >= 0 && to < this.order.length) {
            const tmp = this.order[this.cursor]!;
            this.order[this.cursor] = this.order[to]!;
            this.order[to] = tmp;
            this.cursor = to;
            this.refreshOrder();
          }
        }
        return;
      }

      // typed entry: digits, minus, dot, slash, space (mixed numbers), percent
      if (k === "Backspace") { e.preventDefault(); this.typed = this.typed.slice(0, -1); audio.play("keyTick"); this.refreshTyped(); return; }
      if (/^[0-9./%\- ]$/.test(k)) { e.preventDefault(); this.typed += k === "-" ? MINUS : k; audio.play("keyTick"); this.refreshTyped(); }
    };
    window.addEventListener("keydown", this.keyHandler);
  }

  private refreshTyped(): void {
    this.typedText?.setText(this.typed);
    if (this.caret && this.typedText) this.caret.setX(this.typedText.x + this.typedText.width + 3);
  }

  private refreshOrder(): void {
    this.redrawOrder(this.orderX, this.orderY, this.orderW);
  }

  private pick(i: number): void {
    audio.play("uiMove");
    this.picked = i;
    const x = this.inputX;
    const w = this.inputW;
    this.optionRows.forEach((_, idx) => this.drawPickRow(idx, x, w, idx === i ? "picked" : "default"));
  }

  /* ------------------------------------------------------------- commit */

  private commit(): void {
    if (this.locked) return;

    let given: string;
    let correct: boolean;

    if (this.isPick) {
      if (this.picked < 0) return;
      given = this.problem.optionText?.[this.picked] ?? String(this.picked);
      correct = this.picked === this.problem.correctIndex;
    } else if (this.isOrder) {
      const values = this.problem.answer as unknown[];
      given = this.order.map((i) => String(i)).join(",");
      correct = this.order.every((valueIndex, i) => {
        const a = values[valueIndex] as { n: number; d: number };
        const b = values[i] as { n: number; d: number };
        return a.n * b.d === b.n * a.d;
      });
    } else {
      if (this.typed.trim() === "") return;
      given = this.typed;
      const parsed = parseRational(this.typed);
      correct = parsed !== null && this.problem.accept(parsed);
    }

    this.locked = true;
    this.showResult(correct, given);
    this.opts.onCommit({
      correct,
      given,
      ...(correct ? {} : { errorTag: this.problem.errorTagsByAnswer[given] }),
    });
  }

  private showResult(correct: boolean, given: string): void {
    const state: CardState = correct ? "correct" : "wrong";
    const x = this.inputX;
    const w = this.inputW;

    if (this.isPick) {
      this.optionRows.forEach((_, i) => {
        const s: CardState | "picked" =
          i === this.problem.correctIndex ? "correct" : i === this.picked ? "wrong" : "default";
        this.drawPickRow(i, x, w, s);
      });
    } else if (!this.isOrder && this.inputBox) {
      this.drawTypedBox(x, this.typedText!.y - (HIT.min - SIZE.h3) / 2, w, state);
      this.caret?.setVisible(false);
    }

    // Feedback never says "wrong" alone: it shows the answer and offers RETRY.
    this.feedback.setColor(correct ? C.hud : C.alert);
    this.feedback.setText(
      correct ? "✓ CORRECT" : `✕ YOU ${given} · ANSWER ${this.problem.answerText} · RETRY`,
    );

    this.frame.clear();
    this.frame.fillStyle(N.panel, 1);
    this.frame.fillRoundedRect(0, 0, CARD_W, this.height, RADIUS.panel);
    this.frame.lineStyle(STROKE.hairline, hex(correct ? C.hud : C.alert), 1);
    this.frame.strokeRoundedRect(0, 0, CARD_W, this.height, RADIUS.panel);
  }

  /* -------------------------------------------------------------- public */

  setTimer(text: string, warn = false): void {
    this.timerText.setText(text.toUpperCase());
    this.timerText.setColor(warn ? C.alert : C.lock);
    this.timerText.setX(CARD_W - PAD - this.timerText.width);
    this.fitHeader();
  }

  setMultiplier(text: string): void {
    const left = `${this.problem.skill} · ${this.opts.chapterLabel}${text ? ` · ${text}` : ""}`;
    this.header.setText(left.toUpperCase());
    this.fitHeader();
  }

  /** Re-open the same card for a RETRY: clears the result, keeps the problem. */
  unlock(): void {
    this.locked = false;
    this.picked = -1;
    this.typed = "";
    this.refreshTyped();
    this.feedback.setText("");
    this.caret?.setVisible(true);
    const x = this.inputX;
    const w = this.inputW;
    if (this.isPick) this.optionRows.forEach((_, i) => this.drawPickRow(i, x, w, "default"));
    else if (this.inputBox && this.typedText) this.drawTypedBox(x, this.typedText.y - (HIT.min - SIZE.h3) / 2, w, "default");
    this.frame.clear();
    this.frame.fillStyle(N.panel, 1);
    this.frame.fillRoundedRect(0, 0, CARD_W, this.height, RADIUS.panel);
    this.frame.lineStyle(STROKE.hairline, hex(this.borderColor()), 1);
    this.frame.strokeRoundedRect(0, 0, CARD_W, this.height, RADIUS.panel);
  }

  get cardHeight(): number {
    return this.height;
  }

  destroy(): void {
    if (this.keyHandler) window.removeEventListener("keydown", this.keyHandler);
    this.container.destroy(true);
  }
}
