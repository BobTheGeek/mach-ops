// 12 Pilot profile: rank, callsign, paint schemes, streak.
//
// DESIGN_RECONCILIATION.md section 4 puts rank on mastered skills rather than
// on the artboard's XP bar, so the bar here counts skills toward the next
// insignia — the same number the /dad view will report.

import Phaser from "phaser";
import { C, N, SIZE, TEXT, TRACK, CANVAS, SCREEN_PAD, STROKE, HIT, hex } from "../../ui/tokens";
import { panel, capsLabel, button, resourceBar } from "../ui/kit";
import { gameState } from "../state";
import { shopItem, liveryItemId } from "../../data/shop";
import { setCallsign, setPaint, owns } from "../save";
import { rankFor, nextRank, rankProgress, RANKS } from "../../engine/ranks";
import { FLEET } from "../../data/fleet";
import { loadSprites, phase2Variants } from "../assets";
import { audio } from "../audio";

const MAX_CALLSIGN = 12;

export class ProfileScene extends Phaser.Scene {
  private editing = false;
  private draft = "";
  private callsignText!: Phaser.GameObjects.Text;
  private caret?: Phaser.GameObjects.Rectangle;
  private keyHandler?: (e: KeyboardEvent) => void;
  private paintRow?: Phaser.GameObjects.Container;

  constructor() {
    super("Profile");
  }

  create(): void {
    this.cameras.main.setBackgroundColor(N.ground);
    this.editing = false;

    const title = this.add.text(SCREEN_PAD, 14, "PILOT", { ...TEXT.h3 });
    title.setLetterSpacing(TRACK.display * SIZE.h3);

    button(this, {
      x: CANVAS.width - SCREEN_PAD - 120, y: 8, width: 120, height: HIT.min,
      label: "BACK", variant: "ghost", onClick: () => this.scene.start("Hangar"),
    });

    const rule = this.add.graphics();
    rule.lineStyle(STROKE.hairline, hex(C.border), 1);
    rule.lineBetween(SCREEN_PAD, 58, CANVAS.width - SCREEN_PAD, 58);

    this.identity();
    this.record();
    this.paint();

    this.events.once("shutdown", () => this.detachKeys());
  }

  /* -------------------------------------------------------- identity */

  private identity(): void {
    const w = 560;
    panel(this, SCREEN_PAD, 76, w, 210, { fill: C.panel });

    const mastered = gameState.masteredCount();
    const rank = rankFor(mastered);
    this.insignia(SCREEN_PAD + 24, 104, RANKS.indexOf(rank) + 1);

    const rankText = this.add.text(SCREEN_PAD + 24, 140, rank, { ...TEXT.h2 });
    rankText.setLetterSpacing(TRACK.display * SIZE.h2);

    capsLabel(this, SCREEN_PAD + 24, 176, "CALLSIGN", C.textMuted, TRACK.readout);
    this.callsignText = this.add.text(SCREEN_PAD + 24, 194, gameState.file.callsign, {
      ...TEXT.h3, color: C.hud,
    });
    this.callsignText.setLetterSpacing(TRACK.display * SIZE.h3);

    button(this, {
      x: SCREEN_PAD + 340, y: 186, width: 190, height: HIT.min,
      label: "CHANGE CALLSIGN", variant: "secondary", onClick: () => this.startEdit(),
    });

    // Rank progress, in the same units the rank itself is counted in.
    const next = nextRank(mastered);
    const bar = resourceBar(this, SCREEN_PAD + 24, 246, next ? `TO ${next.rank}` : "TOP RANK", C.hud);
    bar.set(rankProgress(mastered));
    const detail = capsLabel(
      this, SCREEN_PAD + 300, 246,
      next ? `${mastered} / ${next.at} SKILLS MASTERED` : `${mastered} SKILLS MASTERED`,
      C.textMuted, TRACK.readout,
    );
    void detail;
  }

  /** Chevrons, one per rank step. The design lists five insignia and ships none. */
  private insignia(x: number, y: number, steps: number): void {
    const g = this.add.graphics();
    g.lineStyle(STROKE.hud, hex(C.lock), 1);
    for (let i = 0; i < steps; i++) {
      const top = y + i * 9;
      g.lineBetween(x, top + 10, x + 14, top);
      g.lineBetween(x + 14, top, x + 28, top + 10);
    }
  }

  private startEdit(): void {
    if (this.editing) return;
    this.editing = true;
    this.draft = "";
    this.callsignText.setText("");
    this.caret = this.add.rectangle(this.callsignText.x + 3, this.callsignText.y + 14, 2, 22, hex(C.hud))
      .setOrigin(0, 0.5);
    this.tweens.add({ targets: this.caret, alpha: 0, duration: 500, yoyo: true, repeat: -1 });

    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.editing) return;
      if (e.key === "Enter") { e.preventDefault(); this.commitEdit(); return; }
      if (e.key === "Escape") { e.preventDefault(); this.cancelEdit(); return; }
      if (e.key === "Backspace") { e.preventDefault(); this.draft = this.draft.slice(0, -1); }
      else if (/^[a-zA-Z0-9 -]$/.test(e.key) && this.draft.length < MAX_CALLSIGN) {
        e.preventDefault();
        this.draft += e.key.toUpperCase();
      } else return;
      audio.play("keyTick");
      this.callsignText.setText(this.draft);
      this.caret?.setX(this.callsignText.x + this.callsignText.width + 3);
    };
    window.addEventListener("keydown", this.keyHandler);
  }

  private commitEdit(): void {
    // A blank entry keeps the callsign they had, rather than leaving a pilot
    // with no name at all.
    gameState.update(setCallsign(gameState.file, this.draft));
    this.cancelEdit();
  }

  private cancelEdit(): void {
    this.editing = false;
    this.detachKeys();
    this.caret?.destroy();
    this.caret = undefined;
    this.callsignText.setText(gameState.file.callsign);
  }

  private detachKeys(): void {
    if (this.keyHandler) window.removeEventListener("keydown", this.keyHandler);
    this.keyHandler = undefined;
  }

  /* ---------------------------------------------------------- record */

  private record(): void {
    const x = SCREEN_PAD + 580;
    const w = CANVAS.width - x - SCREEN_PAD;
    panel(this, x, 76, w, 210, { fill: C.panel });
    capsLabel(this, x + 20, 92, "RECORD", C.hud, TRACK.readout);

    const f = gameState.file;
    const rows: [string, string][] = [
      ["CREDITS", `${f.credits} CR`],
      ["STREAK", String(f.streak)],
      ["BEST STREAK", String(f.bestStreak)],
      ["SORTIES FLOWN", String(f.missionsFlown.length)],
      ["INTEL CARDS", String(Object.values(f.intelCards).reduce((a, c) => a + c.length, 0))],
      ["AIRFRAMES", `${f.unlockedAirframes.length} OF ${FLEET.length}`],
    ];
    rows.forEach(([k, v], i) => {
      const y = 124 + i * 26;
      capsLabel(this, x + 20, y, k, C.textMuted, TRACK.readout);
      capsLabel(this, x + 190, y, v, C.text, TRACK.readout);
    });

    this.bests(x + 340);
  }

  /**
   * His own bests, beside the running totals.
   *
   * Nothing in the game was a thing to beat twice: totals only ever go up, so
   * they measure how long he has played rather than how well. These three are
   * per-sortie, so they can be improved on deliberately, which is what makes a
   * kid fly one more.
   */
  private bests(x: number): void {
    capsLabel(this, x, 92, "BEST", C.lock, TRACK.readout);

    const r = gameState.file.records;
    const rows: [string, string][] = [
      ["FASTEST SORTIE", r.fastestSortieMs === null ? "\u2014" : clock(r.fastestSortieMs)],
      ["FIRST-TRY HITS", r.mostFirstTryHits === 0 ? "\u2014" : String(r.mostFirstTryHits)],
      ["BEST HAUL", r.bestSortieCredits === 0 ? "\u2014" : `${r.bestSortieCredits} CR`],
    ];
    rows.forEach(([k, v], i) => {
      const y = 124 + i * 26;
      capsLabel(this, x, y, k, C.textMuted, TRACK.readout);
      capsLabel(this, x + 180, y, v, C.lock, TRACK.readout);
    });
  }

  /* ----------------------------------------------------------- paint */

  private paint(): void {
    panel(this, SCREEN_PAD, 302, CANVAS.width - SCREEN_PAD * 2, 330, { fill: C.panel });
    capsLabel(this, SCREEN_PAD + 20, 318, "PAINT SCHEMES", C.hud, TRACK.readout);

    // Only airframes the pilot has AND that the design ships a second scheme for.
    const choosable = FLEET.filter(
      (f) => f.liveries.length > 0 && gameState.file.unlockedAirframes.includes(f.airframe),
    );

    if (choosable.length === 0) {
      const none = this.add.text(SCREEN_PAD + 20, 350, "No alternative schemes yet. Unlock more airframes.", {
        ...TEXT.body, color: C.textMuted,
      });
      void none;
      return;
    }

    this.paintRow?.destroy(true);
    const objects: Phaser.GameObjects.GameObject[] = [];
    let x = SCREEN_PAD + 20;

    for (const f of choosable) {
      const options = [{ id: "", label: "STANDARD" }, ...f.liveries];
      const current = gameState.file.paint[f.airframe] ?? "";
      capsLabel(this, x, 350, f.designation, C.lock, TRACK.readout);
      options.forEach((o, i) => {
        const y = 374 + i * 52;
        const chosen = current === o.id;
        // The standard scheme is his already; an alternative has to be bought in
        // the shop first. A locked one still shows, with its price, because
        // knowing what is there to want is the point of a shop.
        const item = o.id === "" ? null : shopItem(liveryItemId(f.airframe, o.id));
        const locked = item !== null && !owns(gameState.file, item.id);
        button(this, {
          x, y, width: 220, height: HIT.min,
          label: locked ? `${o.label} · ${item!.cost} CR` : o.label,
          variant: locked ? "disabled" : chosen ? "primary" : "secondary",
          onClick: () => {
            if (locked) { audio.play("miss"); return; }
            gameState.update(setPaint(gameState.file, f.airframe, o.id));
            audio.play("uiMove");
            this.scene.restart();
          },
        });
      });
      void this.preview(f.airframe, current, x + 250, 430);
      x += 560;
    }

    this.paintRow = this.add.container(0, 0, objects);
  }

  private async preview(airframe: string, livery: string, cx: number, cy: number): Promise<void> {
    await loadSprites(this, phase2Variants(airframe));
    if (!this.scene.isActive()) return;
    const keys = [livery ? `${airframe}-side-${livery}-gear` : `${airframe}-side-gear`, `${airframe}-side`];
    const key = keys.find((k) => this.textures.exists(k));
    if (!key) return;
    const img = this.add.image(cx, cy, key);
    img.setOrigin(0, 0.5);
    img.setDisplaySize(280, 280 * (img.height / img.width));
  }
}

/** Milliseconds as m:ss, which is how a sortie time reads on the HUD. */
function clock(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
