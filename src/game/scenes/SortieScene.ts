// 04 Sortie (HUD only) · 04B bingo fuel · 05 target lock and bullet-time
// problem · 06 wrong answer: shields drain, lock breaks, retry.
//
// Rules: DESIGN_RECONCILIATION.md section 4 and design/README.md "Gameplay rules".
//   lock costs nothing; fast correct x1.5 credits, streak +1
//   wrong: shields -20%, lock breaks, streak 0, RETRY re-locks the same bogey
//   manual during lock: timer PAUSED, lock held, fast bonus forfeited, no shield cost
//   fast-wrong: worked example pops in, CONTINUE re-serves the same problem
//   HINT: -50 credits, forfeits the fast bonus
//   fuel drains with time, bingo warning at 90 s
//   shields 0 or fuel 0 ends the sortie, progress kept

import Phaser from "phaser";
import {
  C, SIZE, TEXT, TRACK, CANVAS, SCREEN_PAD, TOPBAR_PAD_Y, STROKE, MOTION, hex,
} from "../../ui/tokens";
import { capsLabel, readout, resourceBar, missilePips, button, panel, dim } from "../ui/kit";
import { ProblemCard, CARD_W } from "../ui/problemCard";
import { ManualPanel } from "../ui/manualPanel";
import { gameState, now } from "../state";
import { audio } from "../audio";
import { showTip } from "../ui/firstTimeTip";
import { buildMission, type MissionProblem } from "../missionBuilder";
import { recordAttempt, spendCredits, HINT_COST } from "../save";
import { applyAttempt, initialTierState } from "../../engine/tiers";
import { isFast, FAST_WINDOW_MS } from "../../engine/mastery";
import type { Attempt } from "../../engine/types";
import type { SortieLoadout } from "./BriefingScene";
import { MAX_MISSILES } from "./BriefingScene";
import { mission as findMission, type Mission } from "../../data/campaign";

const BINGO_SECONDS = 90;
const SHIELD_HIT = 0.2;
/** design/README.md: the player sprite sits at (592, 450) at 120 px. */
const PLAYER_POS = { x: 592, y: 450 };

/** Flight model. Arcade, not a simulator: the stick steers a heading and the
 *  aircraft always moves forward, which is what an intercept needs. */
const TURN_RATE = 140;      // degrees per second at full deflection
const SPEED = 190;          // pixels per second
const LOCK_RANGE = 340;     // pixels; SPACE locks the nearest bogey inside this
/** Screen scale for the HUD's range readout: 60 px reads as one nautical mile. */
const PX_PER_NM = 60;
/** Bogeys outside lock range are dimmed, so range is visible and not guesswork. */
const OUT_OF_RANGE_ALPHA = 0.4;
const BOGEY_SPRITES = ["bogey1-top", "bogey2-top", "bogey3-top"];

interface Bogey {
  image: Phaser.GameObjects.Image;
  alive: boolean;
  speed: number;
}

export class SortieScene extends Phaser.Scene {
  private loadout!: SortieLoadout;
  private mission!: Mission;
  private queue: MissionProblem[] = [];
  private index = 0;
  /** problems answered correctly at the first attempt; drives the intel card */
  private firstTryHits = 0;
  private attemptedThisLock = false;

  private fuel = 1;
  private shields = 1;
  private missiles = 0;
  private fuelLeft = 0;
  private sharpened = new Set<string>();

  private player!: Phaser.GameObjects.Image;
  /** compass heading in degrees; 0 is north, which is up the screen */
  private heading = 0;
  private keys!: {
    left: Phaser.Input.Keyboard.Key[];
    right: Phaser.Input.Keyboard.Key[];
  };
  private hdgOut!: ReturnType<typeof readout>;
  private altOut!: ReturnType<typeof readout>;
  private tgtOut!: ReturnType<typeof readout>;
  private bogeys: Bogey[] = [];
  private lockedBogey = -1;
  private locked = false;
  private paused = false;

  private card?: ProblemCard;
  private manual?: ManualPanel;
  private popIn?: Phaser.GameObjects.Container;
  private reticle?: Phaser.GameObjects.Container;
  private worldDim?: Phaser.GameObjects.Rectangle;

  private shownAt = 0;
  private pausedFor = 0;
  private hintUsed = false;
  private bonusForfeit = false;
  private wrongRun = 0;

  private fuelBar!: ReturnType<typeof resourceBar>;
  private shieldBar!: ReturnType<typeof resourceBar>;
  private pips!: ReturnType<typeof missilePips>;
  private timerOut!: ReturnType<typeof readout>;
  private streakOut!: ReturnType<typeof readout>;
  private statusText!: Phaser.GameObjects.Text;
  private bingo?: Phaser.GameObjects.Container;
  /** what the shield bar is currently showing, so a drain can tween from it */
  private shieldShown = 1;

  constructor() {
    super("Sortie");
  }

  init(data: SortieLoadout): void {
    this.loadout = data;
    this.mission = findMission(data.missionId);
    this.fuel = data.fuel;
    this.shields = data.shields;
    this.missiles = data.missiles;
    this.fuelLeft = this.mission.fuelSeconds * data.fuel;
    this.shieldShown = data.shields;
    this.index = 0;
    this.firstTryHits = 0;
    this.attemptedThisLock = false;
    this.locked = false;
    this.lockedBogey = -1;
    this.wrongRun = 0;
    this.sharpened = new Set();
    this.bogeys = [];
  }

  create(): void {
    this.queue = buildMission({
      file: gameState.file,
      skills: gameState.playableSkills,
      log: gameState.file.log,
      now: now(),
      activeUnitId: this.loadout.unitId,
      openUnitIds: gameState.openUnits.map((u) => u.id),
      count: this.mission.problems,
      focusSkills: this.mission.focus,
      seed: gameState.file.log.length + 101,
    });

    audio.setVolume(gameState.file.settings.volume);

    this.world();
    this.hud();
    this.spawnBogeys();

    const kb = this.input.keyboard;
    this.keys = {
      left: [kb?.addKey("A"), kb?.addKey("LEFT")].filter(Boolean) as Phaser.Input.Keyboard.Key[],
      right: [kb?.addKey("D"), kb?.addKey("RIGHT")].filter(Boolean) as Phaser.Input.Keyboard.Key[],
    };

    this.input.keyboard?.on("keydown-SPACE", () => this.tryLock());
    // ESC pauses; quitting from the pause menu is what ends the sortie.
    this.input.keyboard?.on("keydown-ESC", () => this.openPause());
  }

  /* ---------------------------------------------------------------- world */

  private world(): void {
    this.cameras.main.setBackgroundColor(hex(C.sea));
    const g = this.add.graphics();
    g.lineStyle(STROKE.hairline, hex(C.seaGrid), 1);
    for (let x = 0; x <= CANVAS.width; x += 64) g.lineBetween(x, 0, x, CANVAS.height);
    for (let y = 0; y <= CANVAS.height; y += 64) g.lineBetween(0, y, CANVAS.width, y);

    this.player = this.add.image(PLAYER_POS.x, PLAYER_POS.y, "t38-top-flame");
    this.player.setDisplaySize(85, 120);
  }

  private spawnBogeys(): void {
    const lanes = [[300, 140], [640, 90], [980, 170]] as const;
    lanes.slice(0, this.mission.bogeys).forEach(([x, y], i) => {
      const key = BOGEY_SPRITES[i % BOGEY_SPRITES.length]!;
      const img = this.add.image(x, y, this.textures.exists(key) ? key : BOGEY_SPRITES[0]!);
      img.setDisplaySize(51, 72);
      img.setAngle(180); // nose toward the player
      this.bogeys.push({ image: img, alive: true, speed: 4 + i });
    });
  }

  /* ------------------------------------------------------------------ hud */

  private hud(): void {
    const y = TOPBAR_PAD_Y;
    this.altOut = readout(this, SCREEN_PAD, y, "ALT", "12,400 FT");
    readout(this, SCREEN_PAD + 150, y, "SPD", "430 KT");
    this.hdgOut = readout(this, SCREEN_PAD + 300, y, "HDG", "000°");
    this.tgtOut = readout(this, SCREEN_PAD + 450, y, "TGT", "— NM", C.textMuted);

    this.statusText = this.add.text(0, y + 10, "SCANNING", { ...TEXT.label, color: C.hud });
    this.statusText.setLetterSpacing(TRACK.label * SIZE.label);
    this.statusText.setX((CANVAS.width - this.statusText.width) / 2);

    this.streakOut = readout(this, CANVAS.width - SCREEN_PAD - 300, y, "STREAK", String(gameState.file.streak));
    this.timerOut = readout(this, CANVAS.width - SCREEN_PAD - 120, y, "FUEL", "5:00", C.hud);

    // Bottom-left resource stack; the footer hint bar sits centred below it so
    // the two never share a row.
    this.fuelBar = resourceBar(this, SCREEN_PAD, CANVAS.height - 110, "FUEL", C.hud);
    this.shieldBar = resourceBar(this, SCREEN_PAD, CANVAS.height - 66, "SHLD", C.shield);
    this.pips = missilePips(this, CANVAS.width - SCREEN_PAD - MAX_MISSILES * 16, CANVAS.height - 66, MAX_MISSILES);
    const aimLabel = capsLabel(this, CANVAS.width - SCREEN_PAD - MAX_MISSILES * 16, CANVAS.height - 88, "AIM", C.textMuted, TRACK.readout);
    void aimLabel;

    const hint = capsLabel(this, 0, CANVAS.height - 26, "A D · STEER   SPACE · LOCK   M · MANUAL   ESC · PAUSE", C.textMuted, TRACK.readout);
    hint.setX((CANVAS.width - hint.width) / 2);

    this.refreshHud();
  }

  private refreshHud(): void {
    this.fuelBar.set(this.fuel);
    this.shieldBar.set(this.shields);
    this.pips.set(this.missiles);
    this.streakOut.set(String(gameState.file.streak));
    const m = Math.floor(Math.max(0, this.fuelLeft) / 60);
    const s = Math.floor(Math.max(0, this.fuelLeft) % 60);
    this.timerOut.set(`${m}:${String(s).padStart(2, "0")}`);
  }

  /* ---------------------------------------------------------------- loop */

  override update(_time: number, deltaMs: number): void {
    if (this.locked || this.paused) return; // bullet-time holds the world

    this.fuelLeft -= deltaMs / 1000;
    this.fuel = Math.max(0, this.fuelLeft / this.mission.fuelSeconds);
    this.refreshHud();

    if (this.fuelLeft <= BINGO_SECONDS && !this.bingo) this.showBingo();
    if (this.fuelLeft <= 0) { audio.play("flameOut"); this.endSortie("BINGO FUEL"); return; }

    const dt = deltaMs / 1000;
    this.fly(dt);

    for (const b of this.bogeys) {
      if (!b.alive) continue;
      b.image.y += b.speed * dt * 10;
      if (b.image.y > CANVAS.height + 80) b.image.y = -80;
    }
  }

  /**
   * The player holds station at the centre of the screen and the world moves
   * around them, which is how a top-down intercept reads: turning changes where
   * the bogeys go, not where you are.
   */
  private fly(dt: number): void {
    const down = (keys: Phaser.Input.Keyboard.Key[]): boolean => keys.some((k) => k.isDown);
    const turn = (down(this.keys.right) ? 1 : 0) - (down(this.keys.left) ? 1 : 0);
    if (turn !== 0) this.heading = (this.heading + turn * TURN_RATE * dt + 360) % 360;

    this.player.setAngle(0); // the airframe stays nose-up; the world rotates
    const rad = Phaser.Math.DegToRad(this.heading);
    const dx = -Math.sin(rad) * SPEED * dt;
    const dy = Math.cos(rad) * SPEED * dt;

    for (const b of this.bogeys) {
      b.image.x += dx;
      b.image.y += dy;
      // Wrap so a bogey flown past comes round again rather than vanishing.
      if (b.image.x < -100) b.image.x = CANVAS.width + 100;
      if (b.image.x > CANVAS.width + 100) b.image.x = -100;
    }

    this.hdgOut.set(`${String(Math.round(this.heading)).padStart(3, "0")}°`);

    // Range to the nearest bogey, and dim anything out of lock range so the
    // player can see why SPACE will or will not take.
    let nearest = Infinity;
    for (const b of this.bogeys) {
      if (!b.alive) continue;
      const d = Phaser.Math.Distance.Between(PLAYER_POS.x, PLAYER_POS.y, b.image.x, b.image.y);
      b.image.setAlpha(d <= LOCK_RANGE ? 1 : OUT_OF_RANGE_ALPHA);
      nearest = Math.min(nearest, d);
    }
    if (Number.isFinite(nearest)) {
      const inRange = nearest <= LOCK_RANGE;
      this.tgtOut.set(`${(nearest / PX_PER_NM).toFixed(1)} NM`);
      this.tgtOut.value.setColor(inRange ? C.lock : C.textMuted);
      if (inRange && !this.locked) {
        this.statusText.setText("IN RANGE · SPACE TO LOCK");
        this.statusText.setColor(C.lock);
      } else if (!this.locked && this.statusText.text !== "NO TARGET IN RANGE") {
        this.statusText.setText("SCANNING");
        this.statusText.setColor(C.hud);
      }
    } else {
      this.tgtOut.set("— NM");
    }
    // Altitude drifts with the turn, so the ALT readout is live rather than a prop.
    const alt = 12400 + Math.round(Math.cos(rad) * 600);
    this.altOut.set(`${alt.toLocaleString("en-US")} FT`);
  }

  /** The nearest live bogey inside lock range, or -1. */
  private nearestBogey(): number {
    let best = -1;
    let bestDist = LOCK_RANGE;
    this.bogeys.forEach((b, i) => {
      if (!b.alive) return;
      const d = Phaser.Math.Distance.Between(PLAYER_POS.x, PLAYER_POS.y, b.image.x, b.image.y);
      if (d < bestDist) { best = i; bestDist = d; }
    });
    return best;
  }

  /** 04B: bingo fuel warning at 90 s remaining. */
  private showBingo(): void {
    audio.play("bingoWarn");
    const w = 300;
    const x = (CANVAS.width - w) / 2;
    const g = panel(this, x, 96, w, 54, { fill: C.panel, border: C.alert });
    const t = capsLabel(this, x + 20, 114, "BINGO FUEL · 90 S", C.alert);
    this.bingo = this.add.container(0, 0, [g, t]);
    this.tweens.add({ targets: this.bingo, alpha: 0.35, duration: 600, yoyo: true, repeat: 3 });
  }

  /* ---------------------------------------------------------------- lock */

  private tryLock(): void {
    if (this.locked || this.paused) return;
    if (this.index >= this.queue.length) { this.endSortie("ALL TARGETS ENGAGED"); return; }

    if (this.bogeys.every((b) => !b.alive)) { this.endSortie("ALL TARGETS ENGAGED"); return; }

    const target = this.nearestBogey();
    if (target < 0) {
      // Nothing in range: say so rather than silently doing nothing.
      this.statusText.setText("NO TARGET IN RANGE");
      this.statusText.setColor(C.alert);
      return;
    }

    this.lockedBogey = target;
    this.locked = true;
    this.hintUsed = false;
    this.bonusForfeit = false;
    this.attemptedThisLock = false;
    this.statusText.setText("LOCKED");
    this.statusText.setColor(C.lock);

    audio.play("lockAcquire");
    this.drawReticle(this.bogeys[target]!.image);
    this.bulletTimeIn();
    this.showProblem();
  }

  /** tokens.motion.lockBreak: the reticle corners scatter and the ring snaps out. */
  private breakLock(): void {
    audio.play("lockBreak");
    if (!this.reticle || gameState.file.settings.reducedMotion) return;
    this.tweens.killTweensOf(this.reticle);
    this.tweens.add({
      targets: this.reticle,
      scale: 1.6,
      alpha: 0,
      duration: MOTION.lockBreak.duration,
      ease: "Cubic.easeOut",
    });
  }

  private drawReticle(target: Phaser.GameObjects.Image): void {
    const g = this.add.graphics();
    const r = 64; // 128 px ring
    const b = 50; // 100 px corner brackets
    g.lineStyle(STROKE.hud, hex(C.lock), 1);
    g.strokeCircle(0, 0, r);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      g.lineBetween(sx * b, sy * b, sx * b, sy * (b - 18));
      g.lineBetween(sx * b, sy * b, sx * (b - 18), sy * b);
    }
    const label = capsLabel(this, r + 12, -8, "TGT", C.lock, TRACK.readout);
    this.reticle = this.add.container(target.x, target.y, [g, label]);
    this.tweens.add({
      targets: this.reticle,
      scale: MOTION.lockPulse.scale[1],
      duration: MOTION.lockPulse.duration,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private bulletTimeIn(): void {
    audio.play("bulletTimeIn");
    audio.setDucked(true);
    this.worldDim = dim(this, 0);
    this.tweens.add({
      targets: this.worldDim,
      alpha: MOTION.bulletTimeIn.worldDim,
      duration: MOTION.bulletTimeIn.duration,
      ease: "Cubic.easeIn",
    });
  }

  private showProblem(): void {
    const mp = this.queue[this.index]!;
    this.shownAt = this.time.now;
    this.pausedFor = 0;

    this.card = new ProblemCard({
      scene: this,
      problem: mp.problem,
      mode: "lock",
      // design/README.md: honors skills are badged HONORS wherever they appear.
      chapterLabel: `CH ${gameState.chapter(this.loadout.unitId).n} · S${String(this.mission.n).padStart(2, "0")}${
        gameState.skill(mp.problem.skill).honors ? " · HONORS" : ""
      }`,
      multiplier: "×1.5",
      hintCost: HINT_COST,
      onCommit: (r) => this.onCommit(mp, r.correct, r.errorTag),
      onManual: () => this.openManual(mp),
      onHint: () => this.takeHint(mp),
    });

    const x = (CANVAS.width - CARD_W) / 2;
    this.card.container.setPosition(x, 140 + MOTION.cardSlideIn.offsetPx);
    this.card.container.setAlpha(0);
    this.tweens.add({
      targets: this.card.container,
      y: 140,
      alpha: 1,
      duration: MOTION.cardSlideIn.duration,
      ease: "Cubic.easeIn",
    });

    // FT1: the first transfer problem the pilot ever sees.
    if (mp.item.transfer) {
      showTip(this, "FT1", SCREEN_PAD, CANVAS.height - 300);
    }

    this.tickTimer();
  }

  private tickTimer(): void {
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (!this.card || !this.locked) return;
        if (this.paused) { this.card.setTimer("PAUSED"); return; }
        const elapsed = this.time.now - this.shownAt - this.pausedFor;
        const left = Math.max(0, FAST_WINDOW_MS - elapsed) / 1000;
        if (this.bonusForfeit) this.card.setTimer("NO BONUS");
        else if (left > 0) this.card.setTimer(`${left.toFixed(1)}s BONUS`);
        else this.card.setTimer("");
      },
    });
  }

  /* -------------------------------------------------------------- answer */

  private onCommit(mp: MissionProblem, correct: boolean, errorTag?: string): void {
    const responseMs = this.time.now - this.shownAt - this.pausedFor;
    const attempt: Attempt = {
      skill: mp.problem.skill,
      tier: mp.problem.tier,
      correct,
      responseMs,
      hintsUsed: this.hintUsed ? 1 : 0,
      context: mp.item.transfer ? "transfer" : "sortie",
      ...(errorTag ? { errorTag } : {}),
      ts: Date.now(),
    };

    const fast = isFast(attempt) && !this.bonusForfeit;
    const tierState = applyAttempt(initialTierState(gameState.tierOf(mp.problem.skill)), attempt);

    // Save after every attempt.
    gameState.update(
      recordAttempt(gameState.file, {
        attempt,
        fastBonus: correct && fast,
        hash: mp.problem.hash,
        nextTier: tierState.tier,
      }),
    );

    if (correct) {
      audio.play(fast ? "hitFast" : "hit");
      audio.play("streakTick", gameState.file.streak);
      this.streakTick();
      this.sharpened.add(mp.problem.skill);
      // A first-try hit is one answered right with no earlier attempt on this
      // lock and no hint taken; six of them earn an intel card.
      if (!this.attemptedThisLock && !this.hintUsed) this.firstTryHits += 1;
      this.wrongRun = 0;
      this.time.delayedCall(600, () => this.destroyBogey());
      return;
    }

    // Wrong: shields -20%, lock breaks, streak reset (recordAttempt did that).
    this.attemptedThisLock = true;
    this.wrongRun += 1;
    audio.play("miss");
    audio.play("shieldDrain");
    this.breakLock();
    this.shields = Math.max(0, this.shields - SHIELD_HIT);
    this.drainShields();
    this.hitFlash();

    if (fast) {
      // Fast-wrong: the worked example pops in (M6); CONTINUE re-serves it.
      this.time.delayedCall(400, () => this.showWorkedPopIn(mp));
    } else {
      this.time.delayedCall(900, () => {
        if (this.shields <= 0) { this.endSortie("SHIELDS DOWN"); return; }
        this.card?.unlock();
        this.bonusForfeit = true;
        this.shownAt = this.time.now;
      });
    }
  }

  /**
   * Shields animate down rather than jumping, over tokens.motion.shieldDrain.
   * A bar that snaps reads as a rendering glitch; a bar that drains reads as damage.
   */
  private drainShields(): void {
    const from = this.shieldShown;
    const to = this.shields;
    this.shieldShown = to;
    if (gameState.file.settings.reducedMotion) { this.shieldBar.set(to); this.refreshHud(); return; }
    this.tweens.addCounter({
      from: from * 100,
      to: to * 100,
      duration: MOTION.shieldDrain.duration,
      ease: "Cubic.easeOut",
      onUpdate: (tween) => this.shieldBar.set(tween.getValue()! / 100),
    });
    this.refreshHud();
  }

  /** tokens.motion.streakTick: the counter pops as it increments. */
  private streakTick(): void {
    if (gameState.file.settings.reducedMotion) { this.refreshHud(); return; }
    const t = this.streakOut.value;
    this.tweens.add({
      targets: t,
      scale: 1.3,
      duration: MOTION.streakTick.duration / 2,
      yoyo: true,
      ease: "Back.easeOut",
    });
  }

  private hitFlash(): void {
    if (gameState.file.settings.reducedMotion) return;
    const flash = this.add
      .rectangle(0, 0, CANVAS.width, CANVAS.height, hex(MOTION.hitFlash.color), MOTION.hitFlash.opacity)
      .setOrigin(0, 0);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: MOTION.hitFlash.duration,
      onComplete: () => flash.destroy(),
    });
  }

  /** M6: fast-wrong pop-in. Neutral, never a penalty tone. */
  private showWorkedPopIn(mp: MissionProblem): void {
    this.paused = true;
    showTip(this, "FT3", SCREEN_PAD, CANVAS.height - 300);
    const w = 620;
    const x = (CANVAS.width - w) / 2;
    const scrim = dim(this, 0.55);
    const items: Phaser.GameObjects.GameObject[] = [scrim];

    let y = 120;
    const frame = panel(this, x, y, w, 420, { fill: C.panel, border: C.lock });
    items.push(frame);
    const head = capsLabel(this, x + 20, y + 18, "WORKED EXAMPLE", C.lock);
    items.push(head);
    let cy = y + 18 + SIZE.label + 14;
    for (const [i, step] of mp.problem.worked.entries()) {
      const t = this.add.text(x + 20, cy, `${i + 1}.  ${step.text}`, {
        ...TEXT.body,
        wordWrap: { width: w - 40 },
        lineSpacing: 3,
      });
      items.push(t);
      cy += t.height + 2;
      if (step.math) {
        const m = this.add.text(x + 36, cy, step.math, { ...TEXT.value, color: C.shield });
        items.push(m);
        cy += m.height + 8;
      }
    }

    const cont = button(this, {
      x: x + 20,
      y: y + 420 - 64,
      width: 200,
      label: "CONTINUE",
      variant: "primary",
      onClick: () => {
        this.popIn?.destroy(true);
        this.popIn = undefined;
        this.paused = false;
        if (this.shields <= 0) { this.endSortie("SHIELDS DOWN"); return; }
        // Same problem again, no fast bonus.
        this.bonusForfeit = true;
        this.card?.unlock();
        this.shownAt = this.time.now;
      },
    });
    items.push(cont.container);

    this.popIn = this.add.container(0, 0, items);
  }

  private destroyBogey(): void {
    const b = this.bogeys[this.lockedBogey];
    if (b) {
      b.alive = false;
      b.image.setVisible(false);
      this.missiles = Math.max(0, this.missiles - 1);
    }
    this.clearLock();
    this.index += 1;

    if (this.index >= this.queue.length || this.bogeys.every((x) => !x.alive)) {
      this.endSortie("ALL TARGETS ENGAGED");
    }
  }

  private clearLock(): void {
    audio.setDucked(false);
    this.locked = false;
    this.card?.destroy();
    this.card = undefined;
    this.reticle?.destroy(true);
    this.reticle = undefined;
    this.statusText.setText("SCANNING");
    this.statusText.setColor(C.hud);
    if (this.worldDim) {
      const d = this.worldDim;
      this.worldDim = undefined;
      this.tweens.add({
        targets: d,
        alpha: 0,
        duration: MOTION.bulletTimeOut.duration,
        onComplete: () => d.destroy(),
      });
    }
    this.refreshHud();
  }

  /** 13 / HP0: pause as an overlay so the lock and the world are held exactly. */
  private openPause(): void {
    if (this.scene.isActive("Pause")) return;
    const m = Math.floor(Math.max(0, this.fuelLeft) / 60);
    const sec = Math.floor(Math.max(0, this.fuelLeft) % 60);
    this.scene.pause();
    this.scene.launch("Pause", {
      subtitle: `SORTIE ${String(this.mission.n).padStart(2, "0")} · ${m}:${String(sec).padStart(2, "0")}`,
      resumeTo: "Sortie",
      onQuit: () => gameState.save(),
    });
  }

  /* ------------------------------------------------------- manual, hint */

  /** M4: manual during a lock. Timer PAUSED, lock held, bonus forfeit, no shield cost. */
  private openManual(mp: MissionProblem): void {
    if (this.manual) return;
    audio.play("manualOpen");
    this.paused = true;
    this.bonusForfeit = true;
    const pausedAt = this.time.now;

    this.manual = new ManualPanel({
      scene: this,
      skill: mp.problem.skill,
      tier: mp.problem.tier,
      status: gameState.statusOf(mp.problem.skill),
      costNote: "TIMER PAUSED · LOCK HELD\nFAST BONUS FORFEITED · NO SHIELD COST",
      onClose: () => {
        this.manual = undefined;
        this.paused = false;
        this.pausedFor += this.time.now - pausedAt;
      },
    });
  }

  private takeHint(mp: MissionProblem): void {
    if (this.hintUsed) return;
    this.hintUsed = true;
    this.bonusForfeit = true;
    gameState.update(spendCredits(gameState.file, HINT_COST));

    const text = mp.problem.worked[0]?.text ?? "";
    const t = this.add.text(SCREEN_PAD, CANVAS.height - 140, `HINT · ${text}`, {
      ...TEXT.body,
      color: C.lock,
      wordWrap: { width: 420 },
    });
    this.time.delayedCall(6000, () => t.destroy());
  }

  /* ------------------------------------------------------------- ending */

  private endSortie(reason: string): void {
    if (!this.scene.isActive()) return;
    this.clearLock();
    this.scene.start("Debrief", {
      unitId: this.loadout.unitId,
      missionId: this.mission.id,
      firstTryHits: this.firstTryHits,
      problems: this.mission.problems,
      reason,
      sharpened: [...this.sharpened],
      fuel: this.fuel,
      shields: this.shields,
      // 07B: shields or fuel at zero ends the sortie, progress kept.
      failed: this.shields <= 0 || this.fuelLeft <= 0,
    });
  }
}
