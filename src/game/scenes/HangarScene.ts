// 02C Hangar campaign selector: quarters as four bands in a 2x2 grid, chapters
// inside, future quarters dashed with an "OPENS ..." note.
//
// design/README.md: band padding 12, chapter cards are a 72 px sprite column
// plus a text column, header row (CH n · BOSS), 15 px Chakra title, skills
// count, HONORS n/n badge, 44 px CTA.

import Phaser from "phaser";
import { C, N, SIZE, TEXT, TRACK, CANVAS, SCREEN_PAD, RADIUS, STROKE, HIT, hex, STRUCTURE } from "../../ui/tokens";
import { panel, capsLabel, button } from "../ui/kit";
import { gameState } from "../state";
import { isoToMs } from "../../engine/scheduler";
import { SYSTEMS, systemStatus } from "../systems";
import { statusPill } from "../ui/kit";
import { IMPLEMENTED_SKILLS } from "../../generators/index";

const BAND_GAP = 16;
const BAND_PAD = 12;

export class HangarScene extends Phaser.Scene {
  constructor() {
    super("Hangar");
  }

  create(): void {
    this.cameras.main.setBackgroundColor(N.ground);
    this.topBar();
    this.quarters();
  }

  private topBar(): void {
    const y = 14;
    const title = this.add.text(SCREEN_PAD, y, "HANGAR", { ...TEXT.h3 });
    title.setLetterSpacing(TRACK.display * SIZE.h3);

    const pilot = capsLabel(this, SCREEN_PAD + 160, y + 8, `PILOT ${gameState.file.callsign}`, C.textMuted, TRACK.readout);
    const credits = capsLabel(this, SCREEN_PAD + 330, y + 8, `${gameState.file.credits} CR`, C.lock, TRACK.readout);
    void pilot;
    void credits;

    // Top bar. Six destinations now, so the buttons narrow and the labels
    // shorten: at 160 px each they ran back over the credits readout.
    const bar: [string, () => void][] = [
      ["MANUAL", () => this.scene.start("Manual")],
      ["HOW TO PLAY", () => this.scene.start("HowToPlay", { returnTo: "Hangar" })],
      ["FLEET", () => this.scene.start("Fleet")],
      ["PILOT", () => this.scene.start("Profile")],
      ["DOSSIER", () => this.scene.start("Dossier")],
      ["SETTINGS", () => this.scene.start("Settings", { returnTo: "Hangar" })],
    ];
    const bw = 128;
    bar.forEach(([label, go], i) => {
      button(this, {
        x: CANVAS.width - SCREEN_PAD - (bar.length - i) * (bw + 8) + 8,
        y: y - 4,
        width: bw,
        label,
        variant: "ghost",
        onClick: go,
      });
    });

    const rule = this.add.graphics();
    rule.lineStyle(STROKE.hairline, hex(C.border), 1);
    rule.lineBetween(SCREEN_PAD, 58, CANVAS.width - SCREEN_PAD, 58);
  }

  /** FS4's four systems, one per skill group, read from the live save. */
  private systemsStrip(y: number): void {
    const gap = 10;
    const w = (CANVAS.width - SCREEN_PAD * 2 - gap * (SYSTEMS.length - 1)) / SYSTEMS.length;
    SYSTEMS.forEach((name, i) => {
      const x = SCREEN_PAD + i * (w + gap);
      panel(this, x, y, w, 46, { fill: C.panelRaised });
      const label = capsLabel(this, x + 14, y + 16, name, C.text, TRACK.readout);
      void label;
      const status = systemStatus(IMPLEMENTED_SKILLS, (s) => gameState.statusOf(s), name);
      const pill = statusPill(this, x + w - 14 - 150, y + 11, status);
      void pill;
    });
  }

  private quarters(): void {
    const top = 130;
    this.systemsStrip(72);
    const w = (CANVAS.width - SCREEN_PAD * 2 - BAND_GAP) / 2;
    const h = (CANVAS.height - top - SCREEN_PAD - BAND_GAP) / 2;

    const quarterChapters = STRUCTURE.quarterChapters as Record<string, number[]>;
    ([1, 2, 3, 4] as const).forEach((q, i) => {
      const x = SCREEN_PAD + (i % 2) * (w + BAND_GAP);
      const y = top + Math.floor(i / 2) * (h + BAND_GAP);
      this.band(x, y, w, h, q, quarterChapters[`q${q}`] ?? []);
    });
  }

  private band(x: number, y: number, w: number, h: number, q: number, chapterNumbers: number[]): void {
    const chapters = chapterNumbers
      .map((n) => gameState.chapters.find((c) => c.n === n))
      .filter((c): c is NonNullable<typeof c> => c !== undefined);

    const anyOpen = chapters.some((c) => gameState.isOpen(c.id));
    const quarterStart = gameState.schedule.quarters.find((x2) => x2.q === q)?.starts ?? "";

    const g = this.add.graphics();
    g.fillStyle(N.panel, 1);
    g.fillRoundedRect(x, y, w, h, RADIUS.panel);
    if (anyOpen) {
      g.lineStyle(STROKE.hairline, hex(C.border), 1);
      g.strokeRoundedRect(x, y, w, h, RADIUS.panel);
    } else {
      // Future quarters read as dashed and carry their opening date.
      this.dashedRect(g, x, y, w, h);
    }

    const label = capsLabel(this, x + BAND_PAD, y + BAND_PAD, `QUARTER ${q}`, anyOpen ? C.hud : C.textMuted);
    void label;
    if (!anyOpen && quarterStart) {
      const opens = capsLabel(this, 0, y + BAND_PAD, `OPENS ${formatDate(quarterStart)}`, C.textMuted, TRACK.readout);
      opens.setX(x + w - BAND_PAD - opens.width);
    }

    const cardTop = y + BAND_PAD + SIZE.label + 10;
    const cardH = (h - (cardTop - y) - BAND_PAD - (chapters.length - 1) * 8) / Math.max(1, chapters.length);
    chapters.forEach((c, i) => {
      this.chapterCard(x + BAND_PAD, cardTop + i * (cardH + 8), w - BAND_PAD * 2, cardH, c.id);
    });
  }

  private chapterCard(x: number, y: number, w: number, h: number, unitId: string): void {
    const chapter = gameState.chapter(unitId);
    const open = gameState.isOpen(unitId);
    const playable = open && gameState.isPlayable(unitId);
    const skills = gameState.skillsIn(unitId);
    const honors = skills.filter((s) => s.honors);
    const honorsDone = honors.filter((s) => {
      const st = gameState.statusOf(s.id);
      return st === "ONLINE" || st === "OPTIMIZED";
    }).length;

    panel(this, x, y, w, h, { fill: C.panelRaised, border: open ? C.border : C.gridLine });

    // 72 px sprite column; locked chapters use the silhouette export
    const spriteKey = open ? "t38-side" : "t38-side-silhouette";
    if (this.textures.exists(spriteKey)) {
      const img = this.add.image(x + 14 + 36, y + h / 2, spriteKey);
      img.setDisplaySize(72, 27); // side profiles are 1000 x 370
    }

    const textX = x + 14 + 72 + 14;
    const header = capsLabel(this, textX, y + 12, `CH ${chapter.n}${chapter.n === 10 ? " · BOSS" : ""}`, open ? C.lock : C.textMuted, TRACK.readout);
    void header;

    const title = this.add.text(textX, y + 12 + SIZE.label + 4, chapter.name, {
      ...TEXT.h3,
      fontSize: "15px",
      color: open ? C.text : C.textMuted,
      wordWrap: { width: w - (textX - x) - 120 },
    });

    // The artboard's card carries the skills count and the HONORS badge, not a
    // status pill; chapter progress rides on the same row so the card stays one
    // 44 px CTA tall.
    const online = skills.filter((sk) => {
      const st = gameState.statusOf(sk.id);
      return st === "ONLINE" || st === "OPTIMIZED";
    }).length;
    const parts = [`${skills.length} SKILLS`];
    if (honors.length) parts.push(`HONORS ${honorsDone}/${honors.length}`);
    if (open && online > 0) parts.push(`${online} ONLINE`);
    const count = capsLabel(this, textX, title.y + title.height + 6, parts.join("   "), C.textMuted, TRACK.readout);
    void count;

    const ctaW = 120;

    const cta = button(this, {
      x: x + w - 14 - ctaW,
      y: y + h - 14 - HIT.min,
      width: ctaW,
      label: playable ? "SORTIES" : open ? "SOON" : "LOCKED",
      variant: playable ? "primary" : "disabled",
      onClick: () => {
        if (!playable) return;
        this.scene.start("Campaign", { unitId });
      },
    });
    void cta;
  }

  private dashedRect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    g.lineStyle(STROKE.hairline, hex(C.border), 1);
    const dash = 6;
    const gap = 5;
    const run = (x1: number, y1: number, x2: number, y2: number): void => {
      const len = Math.hypot(x2 - x1, y2 - y1);
      const steps = Math.floor(len / (dash + gap));
      for (let i = 0; i < steps; i++) {
        const t0 = (i * (dash + gap)) / len;
        const t1 = (i * (dash + gap) + dash) / len;
        g.lineBetween(x1 + (x2 - x1) * t0, y1 + (y2 - y1) * t0, x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1);
      }
    };
    run(x, y, x + w, y);
    run(x + w, y, x + w, y + h);
    run(x + w, y + h, x, y + h);
    run(x, y + h, x, y);
  }
}

function formatDate(iso: string): string {
  const d = new Date(isoToMs(iso));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
