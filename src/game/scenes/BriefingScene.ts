// 03 Briefing: untimed prep. Each correct prep answer fills a resource; wrong
// answers cost nothing and can be retried freely. 03B is the 1.2 s launch
// transition at the end.

import Phaser from "phaser";
import { C, N, SIZE, TEXT, TRACK, CANVAS, SCREEN_PAD, STROKE, HIT, MOTION, hex } from "../../ui/tokens";
import { panel, capsLabel, button, resourceBar, missilePips } from "../ui/kit";
import { ProblemCard, CARD_W } from "../ui/problemCard";
import { ManualPanel } from "../ui/manualPanel";
import { gameState, now } from "../state";
import { mission as findMission, type Mission } from "../../data/campaign";
import { buildMission, type MissionProblem } from "../missionBuilder";
import { recordAttempt } from "../save";
import { applyAttempt, initialTierState } from "../../engine/tiers";
import { isFast } from "../../engine/mastery";
import type { Attempt } from "../../engine/types";

export const PREP_COUNT = 3;
export const START_FUEL = 0.4;
export const START_SHIELDS = 0.5;
export const START_MISSILES = 2;
export const MAX_MISSILES = 6;

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
    this.preps = buildMission({
      file: gameState.file,
      skills: gameState.playableSkills,
      log: gameState.file.log,
      now: now(),
      activeUnitId: this.unitId,
      openUnitIds: gameState.openUnits.map((u) => u.id),
      count: this.mission.prep,
      seed: gameState.file.log.length + 1,
    });

    this.chrome();
    this.showPrep();
  }

  private chrome(): void {
    const title = this.add.text(SCREEN_PAD, 14, "BRIEFING", { ...TEXT.h3 });
    title.setLetterSpacing(TRACK.display * SIZE.h3);
    const sub = capsLabel(
      this, SCREEN_PAD + 170, 22,
      `SORTIE ${String(this.mission.n).padStart(2, "0")} · ${this.mission.name} · T-38`,
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
    panel(this, px, py, 300, 220, { fill: C.panel });
    const rl = capsLabel(this, px + 16, py + 14, "LOADOUT", C.hud);
    void rl;

    this.fuelBar = resourceBar(this, px + 16, py + 50, "FUEL", C.hud);
    this.shieldBar = resourceBar(this, px + 16, py + 100, "SHLD", C.shield);
    const pl = capsLabel(this, px + 16, py + 150, "AIM", C.textMuted, TRACK.readout);
    void pl;
    this.pips = missilePips(this, px + 16, py + 172, MAX_MISSILES);

    this.fillNote = this.add.text(px + 16, py + 196, "", { ...TEXT.label, color: C.hud });

    const briefLine = this.add.text(this.cardX, 62, this.mission.brief, {
      ...TEXT.body, color: C.textMuted, wordWrap: { width: 560 }, lineSpacing: 2,
    });
    void briefLine;
    this.refreshResources();

    // tactical map placeholder: the sortie's sea grid, scaled down
    const mapY = py + 240;
    panel(this, px, mapY, 300, 210, { fill: C.sea });
    const g = this.add.graphics();
    g.lineStyle(STROKE.hairline, hex(C.seaGrid), 1);
    for (let x = px; x <= px + 300; x += 32) g.lineBetween(x, mapY, x, mapY + 210);
    for (let y = mapY; y <= mapY + 210; y += 32) g.lineBetween(px, y, px + 300, y);
    if (this.textures.exists("t38-top")) {
      this.add.image(px + 150, mapY + 150, "t38-top").setDisplaySize(34, 48);
    }
    for (const [dx, dy] of [[-70, -60], [50, -80], [80, -20]] as const) {
      this.add.image(px + 150 + dx, mapY + 150 + dy, "bogey1-top").setDisplaySize(20, 28).setTint(hex(C.bogey));
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
    return SCREEN_PAD + 300 + 32;
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
      chapterLabel: `PREP ${this.index + 1}/${this.preps.length} · ${FILL[resource]}`,
      hintCost: 0, // hints are free in briefings
      onCommit: (r) => this.onCommit(mp, resource, r.correct, r.errorTag),
      onManual: () => this.openManual(mp),
      onHint: () => this.hint(mp),
    });
    this.card.container.setPosition(this.cardX, 96);
    this.card.setTimer("UNTIMED");
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
      if (resource === "fuel") this.fuel = Math.min(1, this.fuel + 0.2);
      if (resource === "shields") this.shields = Math.min(1, this.shields + 0.25);
      if (resource === "missiles") this.missiles = Math.min(MAX_MISSILES, this.missiles + 2);
      this.refreshResources();
      this.fillNote.setText(FILL[resource]);
      this.index += 1;
      this.time.delayedCall(700, () => this.showPrep());
    } else {
      // Wrong answers cost nothing here; retry freely.
      this.fillNote.setText("");
      this.time.delayedCall(900, () => this.card?.unlock());
    }
  }

  private openManual(mp: MissionProblem): void {
    if (this.manual) return;
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
    this.fillNote.setColor(C.lock);
    this.fillNote.setText(mp.problem.worked[0]?.text ?? "");
  }

  private launchButton(): void {
    const note = this.add.text(this.cardX, 120, "PREP COMPLETE", { ...TEXT.h2, color: C.hud });
    const detail = this.add.text(this.cardX, 170, "Fuel, shields and missiles are loaded. Launch when ready.", {
      ...TEXT.bodyLg,
      color: C.textMuted,
      wordWrap: { width: CARD_W },
    });
    void note;
    void detail;

    button(this, {
      x: this.cardX,
      y: 240,
      width: 260,
      height: HIT.lg,
      label: "LAUNCH",
      variant: "primary",
      onClick: () => this.launch(),
    });

    this.input.keyboard?.once("keydown-ENTER", () => this.launch());

    button(this, {
      x: this.cardX + 280,
      y: 240,
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
