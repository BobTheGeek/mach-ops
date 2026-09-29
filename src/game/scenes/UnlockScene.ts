// 10 Aircraft unlock reveal.
//
// A boss pass hands over the next airframe in the chain, and this is where the
// player is told. The sprite arrives as a silhouette and resolves into the
// livery, which is the one moment in the game where an aircraft is the subject
// rather than the instrument.

import Phaser from "phaser";
import { C, N, SIZE, TEXT, TRACK, CANVAS, SCREEN_PAD, STROKE, HIT, MOTION, hex } from "../../ui/tokens";
import { panel, capsLabel, button } from "../ui/kit";
import { loadSprites, phase2Variants } from "../assets";
import { audio } from "../audio";

/** The reveal is the one screen where the aircraft is the subject, so it is big. */
const HERO_W = 900;

export interface UnlockData {
  airframe: string;
  unitId: string;
}

/** What each airframe is called on the reveal, and one line about it. */
const AIRFRAMES: Record<string, { name: string; designation: string; line: string }> = {
  f4: { name: "PHANTOM II", designation: "F-4E", line: "Two crew, two engines, and no gun on the early ones. They fixed that." },
  a10: { name: "THUNDERBOLT II", designation: "A-10C", line: "Built around its gun. Everything else on it is there to get the gun to work." },
  f16: { name: "FIGHTING FALCON", designation: "F-16C", line: "One engine, one seat, and the first fly-by-wire fighter in service." },
  f14: { name: "TOMCAT", designation: "F-14", line: "Wings that sweep back as it speeds up, and forward again to land on a boat." },
  f15: { name: "EAGLE", designation: "F-15C", line: "Twin fins, twin engines, and a climb rate that took it past a rocket's record." },
  f18: { name: "SUPER HORNET", designation: "F/A-18E", line: "Fighter and attack in one airframe, which is what the F/A in the name means." },
  f117: { name: "NIGHTHAWK", designation: "F-117", line: "All those flat panels are there to scatter radar. Nothing about it is curved by accident." },
  f22: { name: "RAPTOR", designation: "F-22A", line: "Stealth that turns, and engines that point their thrust where the pilot asks." },
  f35: { name: "LIGHTNING II", designation: "F-35A", line: "One airframe, three services, and a helmet that lets the pilot see through the floor." },
  sr71: { name: "BLACKBIRD", designation: "SR-71", line: "It leaked fuel on the ground because it was built to grow in the heat of Mach 3." },
};

export class UnlockScene extends Phaser.Scene {
  private unlock!: UnlockData;

  constructor() {
    super("Unlock");
  }

  init(data: UnlockData): void {
    this.unlock = data;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(N.night);
    const spec = AIRFRAMES[this.unlock.airframe] ?? { name: "NEW AIRFRAME", designation: this.unlock.airframe.toUpperCase(), line: "" };

    const badge = capsLabel(this, SCREEN_PAD, 26, "AIRFRAME UNLOCKED", C.lock, TRACK.readout);
    void badge;

    const title = this.add.text(SCREEN_PAD, 52, spec.name, { ...TEXT.h1 });
    title.setLetterSpacing(TRACK.display * SIZE.h1);

    const designation = capsLabel(this, SCREEN_PAD, 52 + title.height + 6, spec.designation, C.hud, TRACK.display);
    void designation;

    const rule = this.add.graphics();
    rule.lineStyle(STROKE.hairline, hex(C.border), 1);
    const ruleY = 52 + title.height + 34;
    rule.lineBetween(SCREEN_PAD, ruleY, CANVAS.width - SCREEN_PAD, ruleY);

    const line = this.add.text(SCREEN_PAD, ruleY + 16, spec.line, {
      ...TEXT.bodyLg, color: C.textMuted, wordWrap: { width: CANVAS.width - SCREEN_PAD * 2 },
    });
    void line;

    // The sprite loads after the scene is already up, so the reveal has
    // something to reveal rather than appearing fully formed.
    const stage = panel(this, SCREEN_PAD, ruleY + 70, CANVAS.width - SCREEN_PAD * 2, 330, { fill: C.panel });
    void stage;
    void this.reveal(ruleY + 70 + 165);

    button(this, {
      x: SCREEN_PAD,
      y: CANVAS.height - 84,
      width: 260,
      height: HIT.lg,
      label: "TO THE HANGAR",
      variant: "primary",
      onClick: () => this.scene.start("Hangar"),
    });
    button(this, {
      x: SCREEN_PAD + 280,
      y: CANVAS.height - 84,
      width: 220,
      height: HIT.lg,
      label: "DOSSIER",
      variant: "ghost",
      onClick: () => this.scene.start("Dossier"),
    });

    this.input.keyboard?.once("keydown-ENTER", () => this.scene.start("Hangar"));
  }

  /** Silhouette first, then the livery fades in over it. */
  private async reveal(centreY: number): Promise<void> {
    const id = this.unlock.airframe;
    await loadSprites(this, phase2Variants(id));
    if (!this.scene.isActive()) return;

    const x = CANVAS.width / 2;
    const silhouetteKey = `${id}-side-silhouette`;
    const liveryKey = `${id}-side`;

    if (this.textures.exists(silhouetteKey)) {
      const shadow = this.add.image(x, centreY, silhouetteKey);
      shadow.setDisplaySize(HERO_W, HERO_W * (shadow.height / shadow.width));
      shadow.setAlpha(0.5);
      this.tweens.add({ targets: shadow, alpha: 0, duration: MOTION.unlockReveal?.duration ?? 1200, delay: 250 });
    }
    if (this.textures.exists(liveryKey)) {
      const hero = this.add.image(x, centreY, liveryKey);
      hero.setDisplaySize(HERO_W, HERO_W * (hero.height / hero.width));
      hero.setAlpha(0);
      this.tweens.add({ targets: hero, alpha: 1, duration: MOTION.unlockReveal?.duration ?? 1200, delay: 250 });
    }
    audio.play("unlockReveal");
  }
}
