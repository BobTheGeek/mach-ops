// M3 Manual library: one status tile per skill with a Flight Manual page.
//
// The list grew past one screen once Chapters 5 and 6 landed, so it pages
// twelve tiles at a time and the chrome (back, paging) lives in the header
// where it cannot be pushed off the bottom.

import Phaser from "phaser";
import { C, N, SIZE, TEXT, TRACK, CANVAS, SCREEN_PAD, STROKE, HIT, hex } from "../../ui/tokens";
import { panel, capsLabel, button, statusPill } from "../ui/kit";
import { ManualPanel } from "../ui/manualPanel";
import { availablePages } from "../manual";
import { gameState } from "../state";

const COLS = 3;
const ROWS = 4;
const PER_PAGE = COLS * ROWS;
const TILE_H = 140;
const GAP = 10;
const GRID_Y = 72;

export class ManualLibraryScene extends Phaser.Scene {
  private manual?: ManualPanel;
  private page = 0;
  private grid?: Phaser.GameObjects.Container;
  private pageLabel?: Phaser.GameObjects.Text;
  /** overlay mode: hand control back to a paused host instead of the hangar */
  private resumeTo?: string;
  private resumeData?: object;

  constructor() {
    super("Manual");
  }

  init(data: { resumeTo?: string; resumeData?: object } = {}): void {
    this.resumeTo = data.resumeTo;
    this.resumeData = data.resumeData;
  }

  private get pages(): string[] {
    return availablePages();
  }

  private get lastPage(): number {
    return Math.max(0, Math.ceil(this.pages.length / PER_PAGE) - 1);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(N.ground);
    this.page = 0;

    const title = this.add.text(SCREEN_PAD, 14, "FLIGHT MANUAL", { ...TEXT.h3 });
    title.setLetterSpacing(TRACK.display * SIZE.h3);
    const note = capsLabel(this, SCREEN_PAD + 260, 22, "PRACTICE NEVER COUNTS FOR OR AGAINST YOU", C.hud, TRACK.readout);
    void note;

    const rule = this.add.graphics();
    rule.lineStyle(STROKE.hairline, hex(C.border), 1);
    rule.lineBetween(SCREEN_PAD, 58, CANVAS.width - SCREEN_PAD, 58);

    const right = CANVAS.width - SCREEN_PAD;
    button(this, {
      x: right - 90, y: 8, width: 90, height: HIT.min, label: "NEXT", variant: "ghost",
      onClick: () => this.turn(1),
    });
    button(this, {
      x: right - 190, y: 8, width: 90, height: HIT.min, label: "PREV", variant: "ghost",
      onClick: () => this.turn(-1),
    });
    button(this, {
      x: right - 310, y: 8, width: 110, height: HIT.min, label: "BACK", variant: "ghost",
      onClick: () => this.back(),
    });
    this.pageLabel = capsLabel(this, 0, 22, "", C.textMuted, TRACK.readout);

    this.renderGrid();
  }

  private back(): void {
    if (this.resumeTo) {
      this.scene.stop();
      this.scene.start(this.resumeTo, this.resumeData);
      return;
    }
    this.scene.start("Hangar");
  }

  private turn(by: number): void {
    if (this.manual) return;
    const next = Math.min(this.lastPage, Math.max(0, this.page + by));
    if (next === this.page) return;
    this.page = next;
    this.renderGrid();
  }

  private renderGrid(): void {
    this.grid?.destroy(true);
    const objects: Phaser.GameObjects.GameObject[] = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => { objects.push(o); return o; };

    const tileW = (CANVAS.width - SCREEN_PAD * 2 - GAP * (COLS - 1)) / COLS;
    const start = this.page * PER_PAGE;
    const slice = this.pages.slice(start, start + PER_PAGE);

    slice.forEach((skill, i) => {
      const x = SCREEN_PAD + (i % COLS) * (tileW + GAP);
      const y = GRID_Y + Math.floor(i / COLS) * (TILE_H + GAP);
      const registry = gameState.skill(skill);

      add(panel(this, x, y, tileW, TILE_H, { fill: C.panelRaised }));
      const code = add(capsLabel(this, x + 14, y + 16, skill, C.lock, TRACK.readout));
      if (registry.honors) {
        add(capsLabel(this, x + 14 + code.width + 12, y + 16, "HONORS", C.lock, TRACK.readout));
      }
      // The pill shares the code's row: a long skill name needs two lines below
      // it, and it used to be drawn straight through the pill.
      const pill = add(statusPill(this, 0, y + 8, gameState.statusOf(skill)));
      pill.setX(x + tileW - 14 - pill.width);

      add(this.add.text(x + 14, y + 42, registry.name, {
        ...TEXT.body, wordWrap: { width: tileW - 28 },
      }));

      add(button(this, {
        x: x + 14,
        y: y + TILE_H - 54,
        width: tileW - 28,
        label: "OPEN",
        variant: "secondary",
        onClick: () => this.open(skill),
      }).container);
    });

    this.grid = this.add.container(0, 0, objects);

    const total = this.pages.length;
    const to = Math.min(start + PER_PAGE, total);
    this.pageLabel?.setText(`${start + 1}-${to} OF ${total}`);
    this.pageLabel?.setX(CANVAS.width - SCREEN_PAD - 330 - this.pageLabel.width);
  }

  private open(skill: string): void {
    if (this.manual) return;
    this.manual = new ManualPanel({
      scene: this,
      skill,
      tier: gameState.tierOf(skill),
      status: gameState.statusOf(skill),
      costNote: "PRACTICE DOESN'T COUNT FOR OR AGAINST YOU",
      onClose: () => { this.manual = undefined; },
    });
  }
}
