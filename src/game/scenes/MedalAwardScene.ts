// 07C Medal award. After a boss debrief moves a chapter's medal, this is the
// screen that says so: the pendant, what earned it, and what it paid.
//
// The layout follows the Medals handoff's 07C artboard: badge, 300 px pendant
// with the NEW ring, medal name, tier stars, the criteria that were met, and
// the reward line, with TO HANGAR as the only door.

import Phaser from "phaser";
import { C, N, TEXT, TRACK, CANVAS, SCREEN_PAD, HIT, MEDAL } from "../../ui/tokens";
import { capsLabel, button } from "../ui/kit";
import { loadMedalSprites, medalKey } from "../assets";
import { gameState } from "../state";
import {
  MEDAL_NAME, MEDAL_CREDITS, standingCounts,
  type MedalStanding, type MedalTier,
} from "../../engine/medals";
import { stateFor } from "../../engine/mastery";
import { BOSS_UNLOCKS } from "../../data/campaign";
import { fleetEntry } from "../../data/fleet";
import { audio } from "../audio";

export interface MedalAwardData {
  unitId: string;
  tier: MedalTier;
  upgraded: boolean;
  /** the intel card this award granted, when it granted one */
  card?: { airframe: string; index: number } | null;
}

const PENDANT_HERO = 300;

export class MedalAwardScene extends Phaser.Scene {
  private award!: MedalAwardData;

  constructor() {
    super("MedalAward");
  }

  init(data: MedalAwardData): void {
    this.award = data;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(N.night);
    const chapter = gameState.chapter(this.award.unitId);
    const centre = CANVAS.width / 2;

    const left = capsLabel(this, SCREEN_PAD, 26, `DEBRIEF · CH ${chapter.n} · BOSS SORTIE`, C.textMuted, TRACK.readout);
    void left;
    const right = capsLabel(this, 0, 26, "CHAPTER STANDING", C.lock, TRACK.readout);
    right.setX(CANVAS.width - SCREEN_PAD - right.width);

    const badge = capsLabel(this, 0, 84, this.award.upgraded ? "UPGRADED" : "AWARDED", this.award.upgraded ? C.lock : C.hud, TRACK.display);
    badge.setX(centre - badge.width / 2);

    void this.reveal(centre);

    const name = this.add.text(centre, 430, MEDAL_NAME[this.award.tier], { ...TEXT.h1, fontSize: "52px" });
    name.setOrigin(0.5, 0);
    name.setLetterSpacing(0.02 * 52);

    const tier = capsLabel(this, 0, 512, `TIER ${this.award.tier} · ${"★".repeat(this.award.tier)} · CHAPTER ${chapter.n}`, C.textMuted, TRACK.display);
    tier.setX(centre - tier.width / 2);

    this.criteria();

    const rewards = this.rewardsLine();
    const reward = capsLabel(this, SCREEN_PAD, CANVAS.height - 68 + 21, rewards, C.textMuted, TRACK.readout);
    void reward;

    button(this, {
      x: CANVAS.width - SCREEN_PAD - 260,
      y: CANVAS.height - 68,
      width: 260,
      height: HIT.lg,
      label: "TO THE HANGAR",
      variant: "primary",
      onClick: () => this.scene.start("Hangar"),
    });

    this.input.keyboard?.once("keydown-ENTER", () => this.scene.start("Hangar"));
  }

  /** The standing this award was read from, recomputed from the live save. */
  private standing(): MedalStanding {
    const skills = gameState.skillsIn(this.award.unitId);
    const honors = skills.filter((s) => s.honors);
    return {
      bossPassed: gameState.file.bossesPassed.includes(this.award.unitId),
      shieldsNeverZero: true,
      core: skills.filter((s) => !s.honors).map((s) => stateFor(gameState.file.log, s.id)),
      honors: honors.map((s) => stateFor(gameState.file.log, s.id)),
    };
  }

  private criteria(): void {
    const counts = standingCounts(this.standing());
    const toOptimize = counts.coreTotal - counts.coreOptimized;
    const honours = counts.honorsTotal > 0 ? ` · HONORS ${counts.honorsOptimized}/${counts.honorsTotal}` : "";

    const cells: { label: string; value: string; color: string }[] = [
      { label: "BOSS", value: "PASSED", color: C.hud },
      { label: "SKILLS ONLINE", value: `${counts.coreOnline} / ${counts.coreTotal}`, color: C.hud },
    ];
    // The shields gate belongs to DISTINGUISHED and above; an AIRMANSHIP award
    // does not claim it.
    if (this.award.tier >= 2) cells.push({ label: "SHIELDS", value: "NEVER ZERO", color: C.shield });
    if (this.award.tier < 3) {
      cells.push({ label: "FOR ACE", value: `${toOptimize} OPTIMIZED${honours}`, color: C.lock });
    } else {
      cells.push({ label: "ACE", value: "COMPLETE", color: C.lock });
    }

    const centre = CANVAS.width / 2;
    cells.forEach((cell, i) => {
      const x = centre + (i - (cells.length - 1) / 2) * 230;
      const label = capsLabel(this, 0, 552, cell.label, C.textMuted, TRACK.readout);
      label.setX(x - label.width / 2);
      const value = capsLabel(this, 0, 576, cell.value, cell.color, TRACK.readout);
      value.setX(x - value.width / 2);
    });
  }

  /** "+500 CR · INTEL CARD 06 · F-14 · REPLAY BOSS ANY TIME TO UPGRADE". */
  private rewardsLine(): string {
    const parts = [`+${MEDAL_CREDITS[this.award.tier]} CR`];

    // What was actually granted, not an inference from the save: at the card
    // cap nothing is granted, and Chapter 1's card goes to the airframe flown.
    const card = this.award.card;
    if (card) {
      const designation = fleetEntry(card.airframe)?.designation ?? card.airframe;
      parts.push(`INTEL CARD ${String(card.index).padStart(2, "0")} · ${designation}`);
    }

    const airframe = BOSS_UNLOCKS[this.award.unitId];
    if (this.award.tier === 3 && airframe) {
      const scheme = fleetEntry(airframe)?.liveries[0];
      if (scheme) parts.push(`PAINT SCHEME · ${fleetEntry(airframe)?.designation ?? airframe}`);
    }
    parts.push("REPLAY BOSS ANY TIME TO UPGRADE");
    return parts.join(" · ");
  }

  /** The pendant, once its sheet has rasterised. */
  private async reveal(centre: number): Promise<void> {
    await loadMedalSprites(this);
    if (!this.scene.isActive()) return;
    const key = medalKey(this.award.tier, "new");
    if (!this.textures.exists(key)) return;

    // Pendants are portrait (108 x 148); size by the long side.
    const img = this.add.image(centre, 262, key);
    img.setDisplaySize(PENDANT_HERO * (img.width / img.height), PENDANT_HERO);
    this.tweens.add({
      targets: img,
      scaleX: img.scaleX * 1.06, scaleY: img.scaleY * 1.06,
      duration: MEDAL.pulseMs, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });
    audio.play("unlockReveal");
  }
}
