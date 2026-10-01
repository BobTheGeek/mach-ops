// 02C Hangar campaign selector: quarters as four bands in a 2x2 grid, chapters
// inside, future quarters dashed with an "OPENS ..." note.
//
// design/README.md: band padding 12, chapter cards are a 72 px sprite column
// plus a text column, header row (CH n · BOSS), 15 px Chakra title, skills
// count, HONORS n/n badge, 44 px CTA.

import Phaser from "phaser";
import { C, N, SIZE, TEXT, TRACK, CANVAS, SCREEN_PAD, RADIUS, STROKE, HIT, hex, STRUCTURE, MEDAL, MEDAL_METAL } from "../../ui/tokens";
import { panel, capsLabel, button } from "../ui/kit";
import { gameState } from "../state";
import { nextUnlock } from "../../data/campaign";
import { fleetEntry } from "../../data/fleet";
import { SYSTEMS, systemStatus } from "../systems";
import { statusPill } from "../ui/kit";
import { IMPLEMENTED_SKILLS } from "../../generators/index";
import { loadMedalSprites, medalKey } from "../assets";
import { seeMedal } from "../save";
import { gapLineShort, type MedalStanding } from "../../engine/medals";
import { stateFor } from "../../engine/mastery";

const BAND_GAP = 16;
const BAND_PAD = 12;

export class HangarScene extends Phaser.Scene {
  /** units whose unseen medal was drawn this visit, so it can be marked seen */
  private unseenDrawn: string[] = [];

  constructor() {
    super("Hangar");
  }

  create(): void {
    this.cameras.main.setBackgroundColor(N.ground);
    // The medal sheets load after the scene is up, so the cards wait for them
    // rather than draw a medal a frame late. UnlockScene's reveal does the same.
    void this.build();
  }

  private async build(): Promise<void> {
    await loadMedalSprites(this);
    if (!this.scene.isActive()) return;
    this.unseenDrawn = [];
    this.topBar();
    this.quarters();
    // Mark unseen medals seen only after the cards have drawn them: the ring
    // shows on this visit and is gone on the next.
    if (this.unseenDrawn.length > 0) {
      let file = gameState.file;
      for (const id of new Set(this.unseenDrawn)) file = seeMedal(file, id);
      gameState.update(file);
    }
  }

  private topBar(): void {
    const y = 14;
    const title = this.add.text(SCREEN_PAD, y, "HANGAR", { ...TEXT.h3 });
    title.setLetterSpacing(TRACK.display * SIZE.h3);

    const pilot = capsLabel(this, SCREEN_PAD + 160, y + 8, `PILOT ${gameState.file.callsign}`, C.textMuted, TRACK.readout);
    const credits = capsLabel(this, SCREEN_PAD + 330, y + 8, `${gameState.file.credits} CR`, C.lock, TRACK.readout);
    void pilot;
    void credits;


    // Top bar. Seven destinations now, so the buttons narrow again and HOW TO
    // PLAY shortens to HELP: at 128 px each, seven ran back over the credits.
    const bar: [string, () => void][] = [
      ["MANUAL", () => this.scene.start("Manual")],
      ["HELP", () => this.scene.start("HowToPlay", { returnTo: "Hangar" })],
      ["FLEET", () => this.scene.start("Fleet")],
      ["PILOT", () => this.scene.start("Profile")],
      ["DOSSIER", () => this.scene.start("Dossier")],
      ["SHOP", () => this.scene.start("Shop")],
      ["SETTINGS", () => this.scene.start("Settings", { returnTo: "Hangar" })],
    ];
    const bw = 104;
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

    this.nextUp();
  }

  /**
   * What he is flying toward, on the way in.
   *
   * One airframe per chapter boss is about ten sorties apart, which is a long
   * silence. Naming the next one and counting down to it turns that silence
   * into anticipation, and anticipation is most of the reward.
   */
  private nextUp(): void {
    const next = nextUnlock(
      gameState.file.bossesPassed,
      gameState.file.missionsFlown,
      gameState.file.unlockedAirframes,
    );
    if (!next) return;

    const entry = fleetEntry(next.airframe);
    const left = next.sortiesLeft;
    const text = `NEXT AIRFRAME · ${entry?.designation ?? next.airframe} · ${left} SORTIE${left === 1 ? "" : "S"} TO GO`;
    // Left of the button row and below the title, which is the one strip of the
    // top bar that nothing else uses.
    const label = capsLabel(this, SCREEN_PAD, 42, text, C.lock, TRACK.readout);
    void label;
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

    // Since the 2026-09-30 unlock ruling every quarter is open, so bands are
    // never dashed and carry no opening date.
    const g = this.add.graphics();
    g.fillStyle(N.panel, 1);
    g.fillRoundedRect(x, y, w, h, RADIUS.panel);
    g.lineStyle(STROKE.hairline, hex(C.border), 1);
    g.strokeRoundedRect(x, y, w, h, RADIUS.panel);

    const label = capsLabel(this, x + BAND_PAD, y + BAND_PAD, `QUARTER ${q}`, C.hud);
    void label;

    const cardTop = y + BAND_PAD + SIZE.label + 10;
    const cardH = (h - (cardTop - y) - BAND_PAD - (chapters.length - 1) * 8) / Math.max(1, chapters.length);
    chapters.forEach((c, i) => {
      this.chapterCard(x + BAND_PAD, cardTop + i * (cardH + 8), w - BAND_PAD * 2, cardH, c.id);
    });
  }

  private chapterCard(x: number, y: number, w: number, h: number, unitId: string): void {
    const chapter = gameState.chapter(unitId);
    const skills = gameState.skillsIn(unitId);
    const honors = skills.filter((s) => s.honors);
    const honorsDone = honors.filter((s) => {
      const st = gameState.statusOf(s.id);
      return st === "ONLINE" || st === "OPTIMIZED";
    }).length;

    const held = gameState.file.medals[unitId] ?? null;
    const seen = gameState.file.medalsSeen[unitId] ?? 0;
    const isNew = held !== null && held > seen;
    if (isNew) this.unseenDrawn.push(unitId);

    panel(this, x, y, w, h, { fill: C.panelRaised, border: C.border });

    // 72 px sprite column
    if (this.textures.exists("t38-side")) {
      const img = this.add.image(x + 14 + 36, y + h / 2, "t38-side");
      img.setDisplaySize(72, 27); // side profiles are 1000 x 370
    }

    // The medal: full size beside the sprite when the card has the height, the
    // handoff's compact chip beside the CTA when it does not. Quarter 1 and 3
    // cards are ~69 px tall and cannot hold a 48 px pendant, a ribbon and a
    // gap line, so a short card carries tier (and the NEW ring) only.
    const tall = h >= 96;
    const medalSize = tall ? 48 : 24;
    const texture = medalKey(held ?? 1, held ? (isNew ? "new" : "earned") : "locked");
    if (this.textures.exists(texture)) {
      const cx = tall ? x + 14 + 72 + 8 + medalSize / 2 : x + w - 14 - 120 - 10 - medalSize / 2;
      const cy = tall ? y + h / 2 : y + 12 + medalSize / 2;
      const medal = this.add.image(cx, cy, texture);
      // Pendants are portrait (108 x 148); size by the long side.
      medal.setDisplaySize(medalSize * (medal.width / medal.height), medalSize);
      if (isNew) {
        this.tweens.add({
          targets: medal,
          scaleX: medal.scaleX * 1.06, scaleY: medal.scaleY * 1.06,
          duration: MEDAL.pulseMs, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
        });
      }
    }

    const textX = x + 14 + 72 + 14 + (tall ? 56 : 0);
    const ctaW = 120;
    const textRoom = w - (textX - x) - ctaW - (tall ? 0 : 34);
    const header = capsLabel(this, textX, y + 12, `CH ${chapter.n}${chapter.n === 10 ? " · BOSS" : ""}`, C.lock, TRACK.readout);
    void header;

    const title = this.add.text(textX, y + 12 + SIZE.label + 4, chapter.name, {
      ...TEXT.h3,
      fontSize: "15px",
      color: C.text,
      wordWrap: { width: textRoom },
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
    if (online > 0) parts.push(`${online} ONLINE`);
    const rowY = title.y + title.height + 6;
    const count = capsLabel(this, textX, rowY, parts.join("   "), C.textMuted, TRACK.readout);
    void count;

    if (tall) {
      const standing: MedalStanding = {
        bossPassed: gameState.file.bossesPassed.includes(unitId),
        shieldsNeverZero: true,
        core: skills.filter((s) => !s.honors).map((s) => stateFor(gameState.file.log, s.id)),
        honors: honors.map((s) => stateFor(gameState.file.log, s.id)),
      };
      const gapY = y + h - 14 - SIZE.label;
      const gap = capsLabel(this, textX, gapY, gapLineShort(held, standing), held ? MEDAL_METAL[held] : C.textMuted, TRACK.readout);
      void gap;

      // The ribbon bar rides under the pendant in the sprite column, clear of
      // the gap line's text and of the CTA.
      const ribbon = medalKey(held ?? 1, held ? "earned" : "locked", "ribbon");
      if (this.textures.exists(ribbon)) {
        const img = this.add.image(x + 14 + 72 + 8 + medalSize / 2, gapY + SIZE.label / 2, ribbon);
        img.setDisplaySize(56, 56 * (img.height / img.width));
      }
    }

    const cta = button(this, {
      x: x + w - 14 - ctaW,
      y: y + h - 14 - HIT.min,
      width: ctaW,
      label: "SORTIES",
      variant: "primary",
      onClick: () => {
        this.scene.start("Campaign", { unitId });
      },
    });
    void cta;
  }
}
