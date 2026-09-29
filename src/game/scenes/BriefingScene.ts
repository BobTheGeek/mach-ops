// 03 Briefing: untimed prep. Each correct prep answer fills a resource; wrong
// answers cost nothing and can be retried freely. 03B is the 1.2 s launch
// transition at the end.

import Phaser from "phaser";
import { C, N, SIZE, TEXT, TRACK, CANVAS, SCREEN_PAD, STROKE, HIT, MOTION, hex } from "../../ui/tokens";
import { panel, capsLabel, button, resourceBar, missilePips } from "../ui/kit";
import { ProblemCard, CARD_W } from "../ui/problemCard";
import { ManualPanel } from "../ui/manualPanel";
import { gameState, now } from "../state";
import { audio } from "../audio";
import { showTip } from "../ui/firstTimeTip";
import { mission as findMission, type Mission } from "../../data/campaign";
import { buildMission, type MissionProblem } from "../missionBuilder";
import { generatorFor, IMPLEMENTED_SKILLS } from "../../generators/index";
import { recordAttempt } from "../save";
import { applyAttempt, initialTierState } from "../../engine/tiers";
import { isFast } from "../../engine/mastery";
import type { Attempt } from "../../engine/types";
import { fleetEntry } from "../../data/fleet";

/** Card top. Leaves room under the rule for a two-line brief. */
const BRIEF_CARD_Y = 116;

export const PREP_COUNT = 3;
export const START_FUEL = 0.4;
export const START_SHIELDS = 0.5;
export const START_MISSILES = 2;
export const MAX_MISSILES = 6;

/** The left column: the loadout panel and the tactical map beneath it. */
const PANEL_W = 300;
/**
 * 300, not the 220 it was. The note under the pips carries a worked step when
 * the pilot asks for a hint; at 220 it ran out through the right edge on one
 * line. The longest first step any generator writes is g.10.4's, which wraps to
 * five lines ending 376 px down, so the panel has to reach past that.
 * tests/generators/hintLength.test.ts keeps it from growing.
 */
const PANEL_H = 300;

/** What a correct prep answer fills. */
const RESOURCES = ["fuel", "shields", "missiles"] as const;
type Resource = (typeof RESOURCES)[number];

const FILL: Record<Resource, string> = {
  fuel: "+20% FUEL",
  shields: "+25% SHIELDS",
  missiles: "+2 AIM",
};

export interface SortieLoadout {
  unitId: string;
  missionId: string;
  fuel: number;
  shields: number;
  missiles: number;
}

export class BriefingScene extends Phaser.Scene {
  private unitId = "ch1";
  private mission!: Mission;
  private preps: MissionProblem[] = [];
  private index = 0;
  private card?: ProblemCard;
  private manual?: ManualPanel;
  private shownAt = 0;

  private fuel = START_FUEL;
  private shields = START_SHIELDS;
  private missiles = START_MISSILES;

  private fuelBar!: ReturnType<typeof resourceBar>;
  private shieldBar!: ReturnType<typeof resourceBar>;
  private pips!: ReturnType<typeof missilePips>;
  private fillNote!: Phaser.GameObjects.Text;

  constructor() {
    super("Briefing");
  }

  init(data: { unitId?: string; missionId?: string }): void {
    this.unitId = data.unitId ?? "ch1";
    this.mission = findMission(data.missionId ?? "ch1-01");
    this.index = 0;
    this.fuel = START_FUEL;
    this.shields = START_SHIELDS;
    this.missiles = START_MISSILES;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(N.ground);

    // Development only: ?card=<skill>&tier=<n> serves that one skill in prep
    // instead of the queue's choice. The interactive inputs cannot be checked
    // any other way — an honors skill turns up in maybe one prep card in ten,
    // and "reload until it appears" is not a way to look at a figure.
    const forced = import.meta.env.DEV ? forcedCard() : null;
    if (forced) {
      this.preps = forced;
      audio.setVolume(gameState.file.settings.volume);
      this.chrome();
      this.showPrep();
      return;
    }

    this.preps = buildMission({
      file: gameState.file,
      skills: gameState.playableSkills,
      log: gameState.file.log,
      now: now(),
      activeUnitId: this.unitId,
      openUnitIds: gameState.openUnits.map((u) => u.id),
      count: this.mission.prep,
      focusSkills: this.mission.focus,
      seed: gameState.file.log.length + 1,
    });

    audio.setVolume(gameState.file.settings.volume);
    this.chrome();
    this.showPrep();

    // FT2: the first boss briefing.
    if (this.mission.kind === "boss") showTip(this, "FT2", SCREEN_PAD, CANVAS.height - 200);
  }

  private chrome(): void {
    const title = this.add.text(SCREEN_PAD, 14, "BRIEFING", { ...TEXT.h3 });
    title.setLetterSpacing(TRACK.display * SIZE.h3);
    const sub = capsLabel(
      this, SCREEN_PAD + 170, 22,
      `SORTIE ${String(this.mission.n).padStart(2, "0")} · ${this.mission.name} · ${fleetEntry(gameState.currentAirframe())?.designation ?? "T-38"}`,
      this.mission.kind === "boss" ? C.lock : C.textMuted, TRACK.readout,
    );
    void sub;

    const kneeboard = capsLabel(this, 0, 22, "KNEEBOARD OUT · UNTIMED · NO SHIELD RISK", C.hud, TRACK.readout);
    kneeboard.setX(CANVAS.width - SCREEN_PAD - kneeboard.width);

    const rule = this.add.graphics();
    rule.lineStyle(STROKE.hairline, hex(C.border), 1);
    rule.lineBetween(SCREEN_PAD, 58, CANVAS.width - SCREEN_PAD, 58);

    // resources panel on the left
    const px = SCREEN_PAD;
    const py = 90;
    // 280, not 220: the note under the pips carries a worked step when the pilot
    // asks for a hint, and a sentence needs three lines to land inside the panel
    // rather than running out through its right edge.
    panel(this, px, py, PANEL_W, PANEL_H, { fill: C.panel });
    const rl = capsLabel(this, px + 16, py + 14, "LOADOUT", C.hud);
    void rl;

    this.fuelBar = resourceBar(this, px + 16, py + 50, "FUEL", C.hud);
    this.shieldBar = resourceBar(this, px + 16, py + 100, "SHLD", C.shield);
    const pl = capsLabel(this, px + 16, py + 150, "AIM", C.textMuted, TRACK.readout);
    void pl;
    this.pips = missilePips(this, px + 16, py + 172, MAX_MISSILES);

    this.fillNote = this.add.text(px + 16, py + 196, "", {
      ...TEXT.label, color: C.hud, wordWrap: { width: PANEL_W - 32 }, lineSpacing: 3,
    });

    // Briefs run to two lines. The gap between the rule at y=58 and the card
    // only fits one, so the second line was being drawn under the card edge.
    const briefLine = this.add.text(this.cardX, 66, this.mission.brief, {
      ...TEXT.body, color: C.textMuted, wordWrap: { width: 560 }, lineSpacing: 2,
    });
    void briefLine;
    this.refreshResources();

    // tactical map placeholder: the sortie's sea grid, scaled down
    const mapY = py + PANEL_H + 20;
    panel(this, px, mapY, PANEL_W, 210, { fill: C.sea });
    const g = this.add.graphics();
    g.lineStyle(STROKE.hairline, hex(C.seaGrid), 1);
    for (let x = px; x <= px + PANEL_W; x += 32) g.lineBetween(x, mapY, x, mapY + 210);
    for (let y = mapY; y <= mapY + 210; y += 32) g.lineBetween(px, y, px + PANEL_W, y);
    if (this.textures.exists("t38-top")) {
      this.add.image(px + PANEL_W / 2, mapY + 150, "t38-top").setDisplaySize(34, 48);
    }
    for (const [dx, dy] of [[-70, -60], [50, -80], [80, -20]] as const) {
      this.add.image(px + PANEL_W / 2 + dx, mapY + 150 + dy, "bogey1-top").setDisplaySize(20, 28).setTint(hex(C.bogey));
    }
    const ml = capsLabel(this, px + 12, mapY + 10, "TACTICAL", C.textMuted, TRACK.readout);
    void ml;
  }

  private refreshResources(): void {
    this.fuelBar.set(this.fuel);
    this.shieldBar.set(this.shields);
    this.pips.set(this.missiles);
  }

  private get cardX(): number {
    return SCREEN_PAD + PANEL_W + 32;
  }

  private showPrep(): void {
    this.card?.destroy();

    if (this.index >= this.preps.length) {
      this.launchButton();
      return;
    }

    const mp = this.preps[this.index]!;
    const resource = RESOURCES[this.index % RESOURCES.length]!;
    this.shownAt = this.time.now;

    this.card = new ProblemCard({
      scene: this,
      problem: mp.problem,
      mode: "briefing",
      chapterLabel: `PREP ${this.index + 1}/${this.preps.length} · ${FILL[resource]}${
        gameState.skill(mp.problem.skill).honors ? " · HONORS" : ""
      }`,
      hintCost: 0, // hints are free in briefings
      onCommit: (r) => this.onCommit(mp, resource, r.correct, r.errorTag),
      onManual: () => this.openManual(mp),
      onHint: () => this.hint(mp),
    });
    this.card.container.setPosition(this.cardX, BRIEF_CARD_Y);
    this.card.setTimer("UNTIMED");

    // FT4: the first card answered ON the figure. A prep card is the calmest
    // place to meet a new input, so the tip fires here too.
    if (["plot-point", "drag-line", "shade-region"].includes(mp.problem.format)) {
      showTip(this, "FT4", SCREEN_PAD, CANVAS.height - 220);
    }
  }

  private onCommit(mp: MissionProblem, resource: Resource, correct: boolean, errorTag?: string): void {
    const attempt: Attempt = {
      skill: mp.problem.skill,
      tier: mp.problem.tier,
      correct,
      responseMs: this.time.now - this.shownAt,
      hintsUsed: 0,
      context: mp.item.transfer ? "transfer" : "briefing",
      ...(errorTag ? { errorTag } : {}),
      // A prep card is asked once and moves on whether it was right or wrong,
      // so every briefing answer is a first try.
      firstTry: true,
      ts: Date.now(),
    };

    const tierState = applyAttempt(initialTierState(gameState.tierOf(mp.problem.skill)), attempt);
    gameState.update(
      recordAttempt(gameState.file, {
        attempt,
        fastBonus: correct && isFast(attempt),
        hash: mp.problem.hash,
        nextTier: tierState.tier,
      }),
    );

    if (correct) {
      audio.play("hit");
      if (resource === "fuel") this.fuel = Math.min(1, this.fuel + 0.2);
      if (resource === "shields") this.shields = Math.min(1, this.shields + 0.25);
      if (resource === "missiles") this.missiles = Math.min(MAX_MISSILES, this.missiles + 2);
      this.refreshResources();
      this.setNote(FILL[resource], C.hud);
      this.index += 1;
      this.time.delayedCall(700, () => this.showPrep());
    } else {
      audio.play("miss");
      // Wrong answers cost nothing here; retry freely.
      this.setNote("", C.hud);
      this.time.delayedCall(900, () => this.card?.unlock());
    }
  }

  private openManual(mp: MissionProblem): void {
    if (this.manual) return;
    audio.play("manualOpen");
    this.manual = new ManualPanel({
      scene: this,
      skill: mp.problem.skill,
      tier: mp.problem.tier,
      status: gameState.statusOf(mp.problem.skill),
      costNote: "PRACTICE DOESN'T COUNT FOR OR AGAINST YOU",
      onClose: () => { this.manual = undefined; },
    });
  }

  private hint(mp: MissionProblem): void {
    // Free in briefings: show the first worked step.
    this.setNote(mp.problem.worked[0]?.text ?? "", C.lock);
  }

  /**
   * The note under the pips, which is a resource award most of the time and a
   * worked step when the pilot asks for a hint. Always set the colour with the
   * text: the amber of a hint used to stay on for the rest of the briefing.
   */
  private setNote(text: string, color: string): void {
    this.fillNote.setColor(color);
    this.fillNote.setText(text);
  }

  private launchButton(): void {
    const note = this.add.text(this.cardX, 140, "PREP COMPLETE", { ...TEXT.h2, color: C.hud });
    const detail = this.add.text(this.cardX, 190, "Fuel, shields and missiles are loaded. Launch when ready.", {
      ...TEXT.bodyLg,
      color: C.textMuted,
      wordWrap: { width: CARD_W },
    });
    void note;
    void detail;

    button(this, {
      x: this.cardX,
      y: 260,
      width: 260,
      height: HIT.lg,
      label: "LAUNCH",
      variant: "primary",
      onClick: () => this.launch(),
    });

    this.input.keyboard?.once("keydown-ENTER", () => this.launch());

    button(this, {
      x: this.cardX + 280,
      y: 260,
      width: 200,
      height: HIT.lg,
      label: "CAMPAIGN",
      variant: "ghost",
      onClick: () => this.scene.start("Campaign", { unitId: this.unitId }),
    });
  }

  /** 03B: the 1.2 s launch transition. */
  private launch(): void {
    const loadout: SortieLoadout = {
      unitId: this.unitId,
      missionId: this.mission.id,
      fuel: this.fuel,
      shields: this.shields,
      missiles: this.missiles,
    };

    const cover = this.add.rectangle(0, 0, CANVAS.width, CANVAS.height, N.ground, 0).setOrigin(0, 0);
    const label = capsLabel(this, 0, CANVAS.height / 2, "LAUNCHING", C.hud);
    label.setPosition((CANVAS.width - label.width) / 2, CANVAS.height / 2).setAlpha(0);

    this.tweens.add({
      targets: [cover, label],
      alpha: 1,
      duration: MOTION.launchTransition?.duration ?? 1200,
      onComplete: () => this.scene.start("Sortie", loadout),
    });
  }
}

/**
 * Development only. `?card=g.9.1&tier=3` builds two cards of that one skill so a
 * figure or an input can be looked at directly. Returns null when the parameter
 * is absent or names a skill with no generator.
 */
function forcedCard(): MissionProblem[] | null {
  const params = new URLSearchParams(globalThis.location?.search ?? "");
  const skill = params.get("card");
  if (!skill || !IMPLEMENTED_SKILLS.includes(skill)) return null;
  const raw = Number(params.get("tier"));
  const tier = ([1, 2, 3, 4] as const).includes(raw as 1 | 2 | 3 | 4) ? (raw as 1 | 2 | 3 | 4) : 1;
  const seedBase = Number(params.get("seed")) || 0;
  return [0, 1].map((i) => ({
    problem: generatorFor(skill)(tier, seedBase + i),
    item: { skill, tier, slice: "current" as const, transfer: false },
    guardExhausted: false,
  }));
}
