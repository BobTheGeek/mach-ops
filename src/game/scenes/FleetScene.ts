// 09B Fleet spec sheet: eleven airframes, unlocked in livery and locked as
// silhouettes, with the figures they were drawn against.
//
// Every number on this screen comes from src/data/fleet.ts, which cites the
// government fact sheets design/accuracy-check.md audited the sprites against.
// A dash means that document gives no figure; nothing here is filled in from
// memory, because a twelve-year-old who loves aircraft will look these up.

import Phaser from "phaser";
import { C, N, SIZE, TEXT, TRACK, CANVAS, SCREEN_PAD, STROKE, HIT, hex } from "../../ui/tokens";
import { panel, capsLabel, button } from "../ui/kit";
import { FLEET, FLEET_SOURCE, type FleetEntry } from "../../data/fleet";
import { loadSprites, phase2Variants } from "../assets";
import { gameState } from "../state";

const LIST_W = 300;
const ROW_H = 46;

export class FleetScene extends Phaser.Scene {
  private selected = 0;
  private detail?: Phaser.GameObjects.Container;
  private rows: { g: Phaser.GameObjects.Graphics; y: number }[] = [];

  constructor() {
    super("Fleet");
  }

  create(): void {
    this.cameras.main.setBackgroundColor(N.ground);
    this.selected = 0;
    this.rows = [];

    const title = this.add.text(SCREEN_PAD, 14, "FLEET", { ...TEXT.h3 });
    title.setLetterSpacing(TRACK.display * SIZE.h3);

    const have = gameState.file.unlockedAirframes.length;
    const count = capsLabel(this, SCREEN_PAD + 130, 22, `${have} OF ${FLEET.length} UNLOCKED`, C.hud, TRACK.readout);
    void count;

    button(this, {
      x: CANVAS.width - SCREEN_PAD - 120, y: 8, width: 120, height: HIT.min,
      label: "BACK", variant: "ghost", onClick: () => this.scene.start("Hangar"),
    });

    const rule = this.add.graphics();
    rule.lineStyle(STROKE.hairline, hex(C.border), 1);
    rule.lineBetween(SCREEN_PAD, 58, CANVAS.width - SCREEN_PAD, 58);

    this.buildList();
    this.showDetail();

    const source = this.add.text(SCREEN_PAD, CANVAS.height - 54, FLEET_SOURCE, {
      ...TEXT.label, color: C.textMuted, wordWrap: { width: CANVAS.width - SCREEN_PAD * 2 }, lineSpacing: 2,
    });
    void source;

    this.input.keyboard?.on("keydown-DOWN", () => this.move(1));
    this.input.keyboard?.on("keydown-UP", () => this.move(-1));
    this.input.keyboard?.once("keydown-ESC", () => this.scene.start("Hangar"));
  }

  private move(by: number): void {
    this.selected = Math.max(0, Math.min(FLEET.length - 1, this.selected + by));
    this.refreshList();
    this.showDetail();
  }

  private buildList(): void {
    FLEET.forEach((f, i) => {
      const y = 74 + i * ROW_H;
      const g = this.add.graphics();
      this.rows.push({ g, y });

      const unlocked = gameState.file.unlockedAirframes.includes(f.airframe);
      const code = capsLabel(this, SCREEN_PAD + 14, y + 10, f.designation, unlocked ? C.lock : C.textMuted, TRACK.readout);
      void code;
      const name = capsLabel(this, SCREEN_PAD + 110, y + 10, unlocked ? f.name : "LOCKED", unlocked ? C.text : C.border, TRACK.readout);
      void name;

      const zone = this.add.zone(SCREEN_PAD, y, LIST_W, ROW_H).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      zone.on("pointerup", () => { this.selected = i; this.refreshList(); this.showDetail(); });
    });
    this.refreshList();
  }

  private refreshList(): void {
    this.rows.forEach((row, i) => {
      row.g.clear();
      if (i !== this.selected) return;
      row.g.fillStyle(N.panelRaised, 1);
      row.g.fillRoundedRect(SCREEN_PAD, row.y, LIST_W, ROW_H, 6);
      row.g.lineStyle(STROKE.hairline, hex(C.hud), 1);
      row.g.strokeRoundedRect(SCREEN_PAD, row.y, LIST_W, ROW_H, 6);
    });
  }

  private showDetail(): void {
    this.detail?.destroy(true);
    const f = FLEET[this.selected]!;
    const unlocked = gameState.file.unlockedAirframes.includes(f.airframe);

    const x = SCREEN_PAD + LIST_W + 20;
    const w = CANVAS.width - x - SCREEN_PAD;
    const objects: Phaser.GameObjects.GameObject[] = [];

    objects.push(panel(this, x, 74, w, 470, { fill: C.panel }));

    const name = this.add.text(x + 20, 88, unlocked ? f.name : "NOT YET UNLOCKED", { ...TEXT.h3 });
    name.setLetterSpacing(TRACK.display * SIZE.h3);
    objects.push(name);
    objects.push(capsLabel(this, x + 20, 88 + name.height + 4, f.designation, C.hud, TRACK.display));

    // The figures. They are the point of the screen, so they come before the art.
    const rows: [string, string][] = [
      ["LENGTH", `${f.lengthM.toFixed(1)} M`],
      ["SPAN", `${f.spanM.toFixed(1)} M`],
      ["HEIGHT", `${f.heightM.toFixed(1)} M`],
      ["CREW", String(f.crew)],
      ["ENGINES", f.engines],
      ["TOP SPEED", f.topSpeed ?? "—"],
    ];
    rows.forEach(([k, v], i) => {
      const ry = 150 + i * 26;
      objects.push(capsLabel(this, x + 20, ry, k, C.textMuted, TRACK.readout));
      objects.push(capsLabel(this, x + 150, ry, v, C.text, TRACK.readout));
    });

    const note = this.add.text(x + 20, 150 + rows.length * 26 + 10, f.note, {
      ...TEXT.body, color: C.textMuted, wordWrap: { width: w - 40 }, lineSpacing: 3,
    });
    objects.push(note);

    this.detail = this.add.container(0, 0, objects);
    // The sprite sits below the note, not through it: a 540 px side view is
    // 150 px tall and the note ends where the old centre started.
    void this.art(f, unlocked, x + w / 2, 455);
  }

  /** The sprite loads after the panel is up, so switching rows never stalls. */
  private async art(f: FleetEntry, unlocked: boolean, cx: number, cy: number): Promise<void> {
    const want = this.selected;
    await loadSprites(this, phase2Variants(f.airframe));
    if (!this.scene.isActive() || this.selected !== want) return;

    const livery = gameState.file.paint[f.airframe] ?? "";
    const keys = unlocked
      ? [livery ? `${f.airframe}-side-${livery}-gear` : `${f.airframe}-side`, `${f.airframe}-side`]
      : [`${f.airframe}-side-silhouette`, `${f.airframe}-side`];
    const key = keys.find((k) => this.textures.exists(k));
    if (!key) return;

    const img = this.add.image(cx, cy, key);
    const width = Math.min(500, CANVAS.width - SCREEN_PAD * 2 - LIST_W - 60);
    img.setDisplaySize(width, width * (img.height / img.width));
    // A locked airframe is a shape he has not earned yet, so it has to be
    // clearly a shape. The silhouette export is near black and the panel behind
    // it is near black too, so it is tinted up to the muted text grey and left
    // nearly opaque; at the old 0.35 it read as an empty panel.
    if (!unlocked) {
      img.setTintFill(hex(C.textMuted));
      img.setAlpha(0.55);
    }
    this.detail?.add(img);
  }
}
