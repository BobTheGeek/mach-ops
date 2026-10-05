// FS0-FS5 Flight School: four lessons, about six minutes, replayable from the
// hangar. Copy follows the Learning Support artboards.
//
// The lessons are scripted rather than simulated: each step is a callout plus
// one thing to do. Nothing here writes to the attempt log, so practice in Flight
// School never counts for or against the player (docs/design.md principle 2).

import Phaser from "phaser";
import { C, N, SIZE, TEXT, TRACK, CANVAS, SCREEN_PAD, STROKE, HIT, MOTION, hex } from "../../ui/tokens";
import { panel, capsLabel, button, resourceBar, missilePips, readout, dim } from "../ui/kit";
import { gameState } from "../state";
import { audio } from "../audio";
import { dossier } from "../../data/intel";
import { CH1_MISSIONS } from "../../data/campaign";
import { createTerrain, type Terrain } from "../ui/terrain";
import { mountTouchControls, type TouchControls } from "../ui/touchControls";
import { BANK_ANGLE, BANK_FORESHORTEN, PLAYER_H, PLAYER_W, newFlight, stepFlight, type Flight } from "../flight";
import { LOCK_RANGE } from "../sortieRules";
import { mergeTurn, touchMode } from "../touch";

type StepKind = "intro" | "callout" | "pick" | "type" | "fly" | "lock" | "complete";

interface Step {
  lesson: 0 | 1 | 2 | 3 | 4 | 5;
  kind: StepKind;
  /** the tutorial callout copy */
  callout?: string;
  /** what the player must do, shown on the callout's action chip */
  action?: string;
  /** pick / type steps */
  prompt?: string;
  title?: string;
  options?: string[];
  answerIndex?: number;
  answer?: string;
  units?: string;
  /** the one-line explanation shown after a correct answer */
  because?: string;
}

/** Flight School sits in the trainer, and the trainer holds station here. */
const PLAYER_POS = { x: 592, y: 450 };
/** Same display size the sortie draws the airframe at. */
const FS_PLAYER_W = PLAYER_W;
const FS_PLAYER_H = PLAYER_H;
/** A lesson ring is a gate, not a bullseye: generous enough to be steered into. */
const RING_R = 30;
const RING_CATCH = 46;
/** How far a ring may pass the nose before it swings around again. */
const RING_WRAP_Y = CANVAS.height + 60;
/** Lanes a ring cycles through each time it comes around, so camping fails. */
const RING_LANES = [-170, 0, 170];
/** How far above the screen a wrapped ring re-enters. */
const RING_SPAWN_Y = -80;

const STEPS: Step[] = [
  // Lesson 1 is the stick, and it is flown, not read: the rings have to be
  // steered through before the lesson opens. It used to be a callout sitting
  // over a picture of rings, which taught the controls the way a screenshot does.
  { lesson: 1, kind: "fly", callout: "Three rings ahead. W A S D or the arrow keys steer; the aircraft rolls into the turn.", action: "FLY" },
  { lesson: 1, kind: "callout", callout: "The ground and the contacts both slide when you bank. At altitude, watch it tick.", action: "NEXT · ENTER" },
  // Lesson 2 opens with one real lock, again flown rather than described.
  { lesson: 2, kind: "lock", callout: "One slow bogey. Fly it inside the lock range and press SPACE.", action: "LOCK IT" },
  {
    lesson: 2, kind: "pick",
    title: "INTERCEPT SOLUTION",
    prompt: "Bogey at 3.0 NM. You close 1.0 NM every 10 seconds. Seconds until you reach it?",
    options: ["3 SEC", "30 SEC", "300 SEC"],
    answerIndex: 1,
    callout: "Time froze. Every problem is a flight input — this one sets your intercept.",
    action: "PICK B",
    because: "3.0 NM at 1.0 NM per 10 s is 3 steps of 10 seconds.",
  },
  {
    lesson: 2, kind: "callout",
    callout: "A miss costs 20% shield. Nothing else. Fuel and streak are untouched.",
    action: "NEXT · ENTER",
  },
  {
    lesson: 2, kind: "type",
    title: "INTERCEPT SOLUTION · RETRY",
    prompt: "Bogey at 2.0 NM. You close 0.5 NM every 10 seconds. Seconds until you reach it?",
    answer: "40", units: "SEC",
    callout: "Retry is free. 2.0 ÷ 0.5 = 4 steps of 10 s.",
    action: "TYPE 40",
    because: "Retry never costs a shield and never earns the fast bonus.",
  },
  {
    lesson: 3, kind: "type",
    title: "FUEL LOAD",
    prompt: "Burn is 300 lb per minute for a 10-minute sortie. Total fuel to load?",
    answer: "3000", units: "LB",
    callout: "Before every sortie you prep. Each prep answer you get right loads a resource — this one fills fuel.",
    action: "TYPE 3000",
    because: "300 lb every minute for 10 minutes is 3,000 lb.",
  },
  {
    lesson: 3, kind: "callout",
    callout: "Stuck? MANUAL opens the method for this skill. It never costs anything.",
    action: "NEXT · ENTER",
  },
  {
    lesson: 4, kind: "callout",
    callout: "Four systems, one per skill group. They go OFFLINE → CALIBRATING → ONLINE → OPTIMIZED as you master skills.",
    action: "NEXT · ENTER",
  },
  {
    lesson: 4, kind: "callout",
    callout: "Intel cards are facts about the real aircraft. Ten per airframe; sorties with 6 or more first-try hits earn one.",
    action: "NEXT · ENTER",
  },
];

const LESSON_NAMES: Record<number, string> = {
  1: "STICK TIME",
  2: "TARGET LOCK",
  3: "BRIEFING",
  4: "SYSTEMS & UNLOCKS",
};

export class FlightSchoolScene extends Phaser.Scene {
  private step = -1; // -1 is FS0, STEPS.length is FS5
  private layer?: Phaser.GameObjects.Container;
  private typed = "";
  private picked = -1;
  private answered = false;
  private keyHandler?: (e: KeyboardEvent) => void;
  private touch?: TouchControls;
  private touchTurn: -1 | 0 | 1 = 0;

  /** the flown lessons (kind "fly" and "lock") */
  private flight: Flight = newFlight();
  private keys?: { left: Phaser.Input.Keyboard.Key[]; right: Phaser.Input.Keyboard.Key[] };
  private terrain?: Terrain;
  private player?: Phaser.GameObjects.Image;
  private flyStatus?: Phaser.GameObjects.Text;
  private elapsed = 0;
  /** lesson 1: the rings still to be flown through, and how many are done */
  private rings: { lane: number; x: number; y: number; gone: boolean; circle: Phaser.GameObjects.Arc }[] = [];
  private ringsTaken = 0;
  /** lesson 2: the one slow bogey and the lock the player takes on it */
  private bogey?: Phaser.GameObjects.Image;
  private bogeyDrift = { x: -14, y: 10 };
  private reticle?: Phaser.GameObjects.Container;
  private lockedTarget = false;

  constructor() {
    super("FlightSchool");
  }

  init(): void {
    this.step = -1;
    this.typed = "";
    this.picked = -1;
    this.answered = false;
    this.touchTurn = 0;
    this.flight = newFlight();
    this.elapsed = 0;
    this.rings = [];
    this.ringsTaken = 0;
    this.bogey = undefined;
    this.reticle = undefined;
    this.lockedTarget = false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(N.ground);
    this.attachKeys();

    const kb = this.input.keyboard;
    this.keys = {
      left: [kb?.addKey("A"), kb?.addKey("LEFT")].filter(Boolean) as Phaser.Input.Keyboard.Key[],
      right: [kb?.addKey("D"), kb?.addKey("RIGHT")].filter(Boolean) as Phaser.Input.Keyboard.Key[],
    };
    kb?.on("keydown-SPACE", () => this.trySchoolLock());

    if (touchMode()) {
      this.touch = mountTouchControls(this, {
        onTurn: (t) => { this.touchTurn = t; },
        onLock: () => this.trySchoolLock(),
      });
      // Flight School opens on the menu and the lesson cards; the controls
      // appear on the flown steps, where render() shows them, and never before.
      this.touch.setVisible(false);
    }

    this.render();
    this.events.once("shutdown", () => {
      this.detachKeys();
      this.terrain?.destroy();
    });
  }

  private attachKeys(): void {
    this.keyHandler = (e: KeyboardEvent) => {
      const step = STEPS[this.step];

      if (e.key === "Escape") { e.preventDefault(); this.finish(true); return; }
      // A flown step is finished by flying, not by pressing Enter. The lock
      // step listens for SPACE through Phaser's own keyboard plugin.
      if (step && (step.kind === "fly" || step.kind === "lock")) return;
      if (e.key === "Enter") {
        e.preventDefault();
        if (!step || step.kind === "callout") this.advance();
        else this.commit();
        return;
      }
      if (!step || this.answered) return;

      if (step.kind === "pick" && /^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (i < (step.options?.length ?? 0)) { e.preventDefault(); this.picked = i; this.render(); }
        return;
      }
      if (step.kind === "type") {
        if (e.key === "Backspace") { e.preventDefault(); this.typed = this.typed.slice(0, -1); this.render(); return; }
        if (/^[0-9.]$/.test(e.key)) { e.preventDefault(); this.typed += e.key; this.render(); }
      }
    };
    window.addEventListener("keydown", this.keyHandler);
  }

  private detachKeys(): void {
    if (this.keyHandler) window.removeEventListener("keydown", this.keyHandler);
    this.keyHandler = undefined;
  }

  private advance(): void {
    this.leaveFlight();
    this.step += 1;
    this.typed = "";
    this.picked = -1;
    this.answered = false;
    this.render();
  }

  /** Tear down the flown lesson's world when its step is left. */
  private leaveFlight(): void {
    this.terrain?.destroy();
    this.terrain = undefined;
    this.player = undefined;
    this.bogey = undefined;
    this.reticle = undefined;
    this.flyStatus = undefined;
    this.rings = [];
    this.ringsTaken = 0;
    this.lockedTarget = false;
    this.elapsed = 0;
    this.flight = newFlight();
    audio.setDucked(false);
  }

  private commit(): void {
    const step = STEPS[this.step];
    if (!step) return;
    if (this.answered) { this.advance(); return; }

    const right = step.kind === "pick"
      ? this.picked === step.answerIndex
      : this.typed.trim() === step.answer;

    if (!right) {
      // Flight School never penalises: it shows the answer and moves on.
      this.answered = true;
      if (step.kind === "pick" && step.answerIndex !== undefined) this.picked = step.answerIndex;
      if (step.kind === "type" && step.answer) this.typed = step.answer;
      this.render();
      return;
    }
    this.answered = true;
    this.render();
  }

  private finish(skipped: boolean): void {
    this.detachKeys();
    gameState.update({ ...gameState.file, flightSchoolDone: true });
    this.scene.start(skipped ? "Hangar" : "Campaign", skipped ? {} : { unitId: "ch1" });
  }

  /* -------------------------------------------------------------- flying */

  /**
   * The flown lessons. Both use the same model the sortie flies, so what the
   * lesson teaches is exactly what the sortie expects.
   */
  override update(_time: number, deltaMs: number): void {
    const step = STEPS[this.step];
    if (!step || (step.kind !== "fly" && step.kind !== "lock") || !this.player) return;

    const dt = Math.min(0.05, deltaMs / 1000);
    this.elapsed += dt;

    const down = (keys: Phaser.Input.Keyboard.Key[]): boolean => keys.some((k) => k.isDown);
    const keyTurn = (down(this.keys?.right ?? []) ? 1 : 0) - (down(this.keys?.left ?? []) ? 1 : 0);
    const turn = mergeTurn(keyTurn, this.touchTurn);

    const { dx, dy } = stepFlight(this.flight, turn, dt);
    this.player.setAngle(this.flight.bank * BANK_ANGLE);
    this.player.setDisplaySize(FS_PLAYER_W * (1 - BANK_FORESHORTEN * Math.abs(this.flight.bank)), FS_PLAYER_H);
    this.terrain?.update(dx, dy);

    if (this.lockedTarget) return;
    if (step.kind === "fly") this.stepRings(dx, dy);
    else this.stepBogey(dx, dy, dt);
  }

  private stepRings(dx: number, dy: number): void {
    for (const ring of this.rings) {
      if (ring.gone) continue;
      ring.x += dx;
      ring.y += dy;
      ring.circle.setPosition(ring.x, ring.y);

      const d = Phaser.Math.Distance.Between(PLAYER_POS.x, PLAYER_POS.y, ring.x, ring.y);
      if (d <= RING_CATCH) { this.takeRing(ring); continue; }

      // A missed ring is not a failure: it swings around and comes back, in the
      // next lane, so the stick gets the workout rather than the scoreboard.
      if (ring.y > RING_WRAP_Y) {
        ring.lane = (ring.lane + 1) % RING_LANES.length;
        ring.x = PLAYER_POS.x + RING_LANES[ring.lane]!;
        ring.y = RING_SPAWN_Y;
      }
    }
  }

  private takeRing(ring: { gone: boolean; circle: Phaser.GameObjects.Arc }): void {
    ring.gone = true;
    ring.circle.setVisible(false);
    this.ringsTaken += 1;
    audio.play("uiConfirm");
    this.flyStatus?.setText(this.ringStatus());
    this.flyStatus?.setColor(C.lock);
    if (this.ringsTaken >= this.rings.length) {
      this.time.delayedCall(700, () => {
        if (STEPS[this.step]?.kind === "fly") this.advance();
      });
    }
  }

  private ringStatus(): string {
    return this.ringsTaken >= this.rings.length
      ? "RINGS 3 / 3 · NICE HANDLING"
      : `RINGS ${this.ringsTaken} / 3`;
  }

  private stepBogey(dx: number, dy: number, dt: number): void {
    const b = this.bogey;
    if (!b) return;
    // The world comes at the player, so the contact does too, but only at part
    // of the world's speed: a contact that closed at the player's own rate
    // could not be caught by steering.
    b.x += dx + this.bogeyDrift.x * dt;
    b.y += dy * 0.55 + this.bogeyDrift.y * dt;
    if (b.y > CANVAS.height + 60) {
      b.setPosition(PLAYER_POS.x + RING_LANES[(this.elapsed | 0) % RING_LANES.length]!, RING_SPAWN_Y);
    }

    const d = Phaser.Math.Distance.Between(PLAYER_POS.x, PLAYER_POS.y, b.x, b.y);
    b.setAlpha(d <= LOCK_RANGE ? 1 : 0.4);
    this.touch?.setLockable(d <= LOCK_RANGE);
    if (d <= LOCK_RANGE) {
      this.flyStatus?.setText(touchMode() ? "IN RANGE · TAP LOCK" : "IN RANGE · SPACE TO LOCK");
      this.flyStatus?.setColor(C.lock);
    } else {
      this.flyStatus?.setText(`CONTACT ${Math.round(d)} PX · CLOSE TO LOCK`);
      this.flyStatus?.setColor(C.textMuted);
    }
  }

  /** SPACE in the lock lesson. Same rule as the sortie: in range or nothing. */
  private trySchoolLock(): void {
    const step = STEPS[this.step];
    if (!step || step.kind !== "lock" || this.lockedTarget || !this.bogey) return;
    const d = Phaser.Math.Distance.Between(PLAYER_POS.x, PLAYER_POS.y, this.bogey.x, this.bogey.y);
    if (d > LOCK_RANGE) return;

    this.lockedTarget = true;
    audio.play("lockAcquire");
    audio.setDucked(true);

    const g = this.add.graphics();
    const r = 64;
    const b = 50;
    g.lineStyle(STROKE.hud, hex(C.lock), 1);
    g.strokeCircle(0, 0, r);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      g.lineBetween(sx * b, sy * b, sx * b, sy * (b - 18));
      g.lineBetween(sx * b, sy * b, sx * (b - 18), sy * b);
    }
    const label = capsLabel(this, r + 12, -8, "TGT", C.lock, TRACK.readout);
    this.reticle = this.add.container(this.bogey.x, this.bogey.y, [g, label]);
    this.layer?.add(this.reticle);
    this.flyStatus?.setText("LOCKED · TARGET SOLUTION FOLLOWS");
    this.flyStatus?.setColor(C.lock);

    this.time.delayedCall(1000, () => {
      audio.setDucked(false);
      if (STEPS[this.step]?.kind === "lock") this.advance();
    });
  }

  /* ----------------------------------------------------------- rendering */

  private render(): void {
    this.layer?.destroy(true);
    this.layer = this.add.container(0, 0);

    if (this.step < 0) { this.renderIntro(); return; }
    if (this.step >= STEPS.length) { this.renderComplete(); return; }

    const step = STEPS[this.step]!;
    this.touch?.setVisible(step.kind === "fly" || step.kind === "lock");
    // The accent is live state from stepBogey; a stale one must not survive a
    // step change.
    this.touch?.setLockable(false);
    if (step.kind === "fly") { this.renderRollRingStep(step); return; }
    if (step.kind === "lock") { this.renderLockStep(step); return; }

    this.renderBackdrop(step);
    this.renderChrome(step);
    if (step.kind !== "callout") this.renderProblem(step);
    this.renderCallout(step);
  }

  private add2(...objects: Phaser.GameObjects.GameObject[]): void {
    this.layer?.add(objects);
  }

  /** FS0: the four-lesson menu. */
  private renderIntro(): void {
    const head = capsLabel(this, 0, 120, "FLIGHT SCHOOL · 4 LESSONS · ABOUT 6 MINUTES", C.textMuted);
    head.setX((CANVAS.width - head.width) / 2);

    const title = this.add.text(0, 150, "LEARN THE STICK", { ...TEXT.h1 });
    title.setLetterSpacing(TRACK.display * SIZE.h1);
    title.setX((CANVAS.width - title.width) / 2);
    this.add2(head, title);

    const lessons: [string, string][] = [
      ["STICK TIME", "Fly three rings. No enemies, no math."],
      ["TARGET LOCK", "One slow bogey. Your first cockpit problem."],
      ["BRIEFING", "Prep problems fill your fuel. Meet the manual."],
      ["SYSTEMS & UNLOCKS", "Debrief, hangar, your first intel card."],
    ];
    const w = 260;
    const gap = 16;
    const startX = (CANVAS.width - (w * 4 + gap * 3)) / 2;
    lessons.forEach(([name, copy], i) => {
      const x = startX + i * (w + gap);
      const y = 250;
      this.add2(panel(this, x, y, w, 150, { fill: C.panel }));
      this.add2(capsLabel(this, x + 16, y + 14, `LESSON ${i + 1}`, C.lock, TRACK.readout));
      const t = this.add.text(x + 16, y + 38, name, { ...TEXT.h3, fontSize: "18px" });
      const c = this.add.text(x + 16, y + 70, copy, {
        ...TEXT.body, color: C.textMuted, wordWrap: { width: w - 32 }, lineSpacing: 2,
      });
      this.add2(t, c);
    });

    const start = button(this, {
      x: (CANVAS.width - 260) / 2, y: 440, width: 260, height: HIT.lg,
      label: "START · ENTER", variant: "primary", onClick: () => this.advance(),
    });
    const skip = button(this, {
      x: (CANVAS.width - 260) / 2, y: 440 + HIT.lg + 12, width: 260,
      label: "SKIP · ESC", variant: "ghost", onClick: () => this.finish(true),
    });
    this.add2(start.container, skip.container);

    const foot = capsLabel(this, 0, CANVAS.height - 60, "REPLAY ANY TIME FROM THE HANGAR", C.textMuted, TRACK.readout);
    foot.setX((CANVAS.width - foot.width) / 2);
    this.add2(foot);
  }

  /**
   * The flown backdrop: real terrain, the real aircraft, the real model.
   *
   * A lesson that answers to a different flight model than the sortie would be
   * worse than no lesson, so both go through stepFlight, and the terrain is the
   * same generator the sortie scrolls.
   */
  private startFlightView(step: Step): void {
    this.cameras.main.setBackgroundColor(hex(C.sea));
    this.terrain?.destroy();
    this.terrain = createTerrain(this, `flight-school|${step.kind}`);
    // The terrain container is appended after the lesson layer, so on its own it
    // paints straight over the aircraft, the rings and the callout. The layer
    // rides on top of the world.
    if (this.layer) this.children.bringToTop(this.layer);
    // The controls ride above the layer too, or the terrain and the callout
    // would bury the paddles and LOCK.
    this.touch?.bringToTop();
    this.player = this.add.image(PLAYER_POS.x, PLAYER_POS.y, "t38-top-flame").setDisplaySize(FS_PLAYER_W, FS_PLAYER_H);
    this.add2(this.player);
    this.renderChrome(step);
  }

  /** Lesson 1: three rings that have to be steered through. */
  private renderRollRingStep(step: Step): void {
    this.startFlightView(step);

    this.ringsTaken = 0;
    this.rings = RING_LANES.map((offset, lane) => {
      const x = PLAYER_POS.x + offset;
      const y = 150 + lane * 40;
      const circle = this.add.circle(x, y, RING_R);
      circle.setStrokeStyle(STROKE.hud * 2, hex(C.hud), 0.9);
      circle.setFillStyle(hex(C.hud), 0.06);
      this.add2(circle);
      return { lane, x, y, gone: false, circle };
    });

    this.flyStatus = capsLabel(this, 0, 96, this.ringStatus(), C.hud, TRACK.readout);
    this.flyStatus.setX((CANVAS.width - this.flyStatus.width) / 2);
    this.add2(this.flyStatus);
    this.renderFlyCallout(step, "A D OR \u2190 \u2192 · STEER");
  }

  /** Lesson 2: one slow bogey and a real SPACE lock. */
  private renderLockStep(step: Step): void {
    this.startFlightView(step);

    this.lockedTarget = false;
    // Starts off the nose and outside lock range, so the lesson is to fly it
    // into the cone rather than to press SPACE at whatever is on screen.
    this.bogey = this.add.image(PLAYER_POS.x - 250, 90, this.textures.exists("bogey1-top") ? "bogey1-top" : "t38-top");
    this.bogey.setDisplaySize(51, 72).setAngle(180);
    this.add2(this.bogey);

    this.flyStatus = capsLabel(this, 0, 96, "CONTACT · CLOSE TO LOCK", C.textMuted, TRACK.readout);
    this.flyStatus.setX((CANVAS.width - this.flyStatus.width) / 2);
    this.add2(this.flyStatus);
    this.renderFlyCallout(step, "SPACE · LOCK WHEN IN RANGE");
  }

  /** The callout for a flown step: no CHECK button, because flying is the check. */
  private renderFlyCallout(step: Step, chip: string): void {
    const w = 420;
    const x = CANVAS.width - SCREEN_PAD - w;
    const y = CANVAS.height - 210;

    this.add2(panel(this, x, y, w, 120, { fill: C.panelRaised, border: C.hud }));
    const text = this.add.text(x + 16, y + 16, step.callout ?? "", {
      ...TEXT.body, wordWrap: { width: w - 32 }, lineSpacing: 3,
    });
    this.add2(text);
    this.add2(capsLabel(this, x + 16, y + 120 - 16 - SIZE.label, chip, C.hud, TRACK.readout));
  }

  /** Lessons 1 and 2 sit over the sortie world; 3 and 4 over the dark ground. */
  private renderBackdrop(step: Step): void {
    const flying = step.lesson <= 2;
    this.cameras.main.setBackgroundColor(flying ? hex(C.sea) : N.ground);

    const g = this.add.graphics();
    if (flying) {
      g.lineStyle(STROKE.hairline, hex(C.seaGrid), 1);
      for (let x = 0; x <= CANVAS.width; x += 64) g.lineBetween(x, 0, x, CANVAS.height);
      for (let y = 0; y <= CANVAS.height; y += 64) g.lineBetween(0, y, CANVAS.width, y);
    }
    this.add2(g);

    if (flying && this.textures.exists("t38-top-flame")) {
      this.add2(this.add.image(592, 470, "t38-top-flame").setDisplaySize(85, 120));
    }

    if (step.lesson === 1) {
      // three rings to fly through
      const rings = this.add.graphics();
      rings.lineStyle(STROKE.hud, hex(C.hud), 0.8);
      for (const [rx, ry] of [[380, 200], [640, 150], [900, 230]] as const) rings.strokeCircle(rx, ry, 34);
      this.add2(rings);
    }

    if (step.lesson === 2) {
      // Clear of the problem card, which is centred: the reticle has to be visible
      // for the callout about it to mean anything.
      const bogey = this.add.image(200, 230, this.textures.exists("bogey1-top") ? "bogey1-top" : "t38-top");
      bogey.setDisplaySize(51, 72).setAngle(180);
      const reticle = this.add.graphics();
      reticle.lineStyle(STROKE.hud, hex(C.lock), 1);
      reticle.strokeCircle(200, 230, 64);
      this.add2(bogey, reticle);
      this.add2(dim(this, MOTION.bulletTimeIn.worldDim));
    }

    if (step.lesson === 4) this.renderHangarBackdrop();
  }

  private renderHangarBackdrop(): void {
    const systems: [string, string][] = [
      ["RADAR", "ONLINE"], ["ENGINES", "OFFLINE"], ["AVIONICS", "OFFLINE"], ["WEAPONS", "OFFLINE"],
    ];
    systems.forEach(([name, status], i) => {
      const x = SCREEN_PAD;
      const y = 120 + i * 56;
      this.add2(panel(this, x, y, 320, 44, { fill: C.panelRaised }));
      this.add2(capsLabel(this, x + 14, y + 14, name, C.text, TRACK.readout));
      this.add2(capsLabel(this, x + 210, y + 14, status, status === "ONLINE" ? C.hud : C.textMuted, TRACK.readout));
    });

    const card = dossier("t38")?.cards[0];
    if (card) {
      const x = SCREEN_PAD + 360;
      const y = 120;
      this.add2(panel(this, x, y, 380, 160, { fill: C.panel, border: C.lock }));
      this.add2(capsLabel(this, x + 16, y + 14, "INTEL · TEASER   T-38 · 01", C.lock, TRACK.readout));
      const t = this.add.text(x + 16, y + 42, card.title, { ...TEXT.h3, fontSize: "18px" });
      const b = this.add.text(x + 16, y + 72, card.body, {
        ...TEXT.body, color: C.textMuted, wordWrap: { width: 348 }, lineSpacing: 2,
      });
      this.add2(t, b);
    }
  }

  private renderChrome(step: Step): void {
    const y = 20;
    const touch = touchMode();
    if (step.lesson <= 2) {
      this.add2(readout(this, SCREEN_PAD, y, "ALT", "12,400 FT").label);
      this.add2(readout(this, SCREEN_PAD + 150, y, "SPD", "430 KT").label);
      // On touch the steer paddles own the bottom-left, so the resource stack
      // moves up to clear them; the keyboard layout keeps its bottom row.
      this.add2(resourceBar(this, SCREEN_PAD, touch ? 504 : CANVAS.height - 110, "FUEL", C.hud).container);
      this.add2(resourceBar(this, SCREEN_PAD, touch ? 548 : CANVAS.height - 66, "SHLD", C.shield).container);
      // The flown steps put LOCK on the bottom-right, so the pips move up to
      // clear it. y 556 sits behind the fly callout (x 828-1248, y 510-630),
      // so they ride just above the callout instead; the card steps keep the
      // bottom row and have no controls.
      const flying = step.kind === "fly" || step.kind === "lock";
      const pipsY = touch && flying ? 488 : CANVAS.height - 66;
      this.add2(missilePips(this, CANVAS.width - SCREEN_PAD - 100, pipsY, 6).container);
    }

    const label = capsLabel(this, 0, y, `FLIGHT SCHOOL ${step.lesson}/4 · ${LESSON_NAMES[step.lesson] ?? ""}`, C.hud, TRACK.readout);
    label.setX(CANVAS.width - SCREEN_PAD - label.width);
    this.add2(label);

    const skip = capsLabel(this, 0, CANVAS.height - 26, "NO ENEMIES · NO MATH GRADE · ESC · SKIP FLIGHT SCHOOL", C.textMuted, TRACK.readout);
    skip.setX((CANVAS.width - skip.width) / 2);
    this.add2(skip);
  }

  private renderProblem(step: Step): void {
    const w = 520;
    const x = (CANVAS.width - w) / 2;
    const y = 150;

    const prompt = this.add.text(x + 20, y + 52, step.prompt ?? "", {
      ...TEXT.bodyLg, wordWrap: { width: w - 40 }, lineSpacing: 4,
    });

    let bodyH = 0;
    const parts: Phaser.GameObjects.GameObject[] = [];

    if (step.kind === "pick") {
      const rowH = 56;
      (step.options ?? []).forEach((opt, i) => {
        const top = y + 52 + prompt.height + 14 + i * (rowH + 8);
        const g = this.add.graphics();
        const chosen = this.picked === i;
        const right = this.answered && i === step.answerIndex;
        g.lineStyle(chosen || right ? 2 : STROKE.hairline, hex(right ? C.hud : chosen ? C.hud : C.border), 1);
        g.strokeRoundedRect(x + 20, top, w - 40, rowH, 8);
        if (right) { g.fillStyle(hex(C.correctFill), 1); g.fillRoundedRect(x + 20, top, w - 40, rowH, 8); }
        const t = this.add.text(x + 36, top + 16, `${i + 1}   ${opt}`, { ...TEXT.value });
        parts.push(g, t);
        bodyH = top + rowH - (y + 52 + prompt.height + 14) + 8;
      });
    } else {
      const top = y + 52 + prompt.height + 16;
      const g = this.add.graphics();
      g.lineStyle(this.answered ? 2 : STROKE.hairline, hex(this.answered ? C.hud : C.hud), 1);
      if (this.answered) { g.fillStyle(hex(C.correctFill), 1); g.fillRoundedRect(x + 20, top, w - 40, HIT.min, 8); }
      g.strokeRoundedRect(x + 20, top, w - 40, HIT.min, 8);
      const t = this.add.text(x + 36, top + 8, `${this.typed || "_"}  ${step.units ?? ""}`, { ...TEXT.valueLg });
      parts.push(g, t);
      bodyH = HIT.min + 8;
    }

    const cardH = 52 + prompt.height + 14 + bodyH + (this.answered ? 52 : 28);
    this.add2(panel(this, x, y, w, cardH, { fill: C.panel, border: C.lock }));
    this.add2(capsLabel(this, x + 20, y + 18, `${step.title ?? ""}   TIER 1   TIMER OFF · LESSON`, C.lock, TRACK.readout));
    this.add2(prompt, ...parts);

    if (this.answered && step.because) {
      this.add2(this.add.text(x + 20, y + cardH - 40, `✓ ${step.because}`, { ...TEXT.label, color: C.hud }));
    }
  }

  private renderCallout(step: Step): void {
    const w = 420;
    const x = CANVAS.width - SCREEN_PAD - w;
    const y = CANVAS.height - 210;

    this.add2(panel(this, x, y, w, 120, { fill: C.panelRaised, border: C.hud }));
    const text = this.add.text(x + 16, y + 16, step.callout ?? "", {
      ...TEXT.body, wordWrap: { width: w - 32 }, lineSpacing: 3,
    });
    this.add2(text);

    const label = this.answered || step.kind === "callout" ? "NEXT · ENTER" : (step.action ?? "DO IT");
    const chip = capsLabel(this, x + 16, y + 120 - 16 - SIZE.label, label, C.hud, TRACK.readout);
    this.add2(chip);

    const next = button(this, {
      x: x + w - 16 - 150, y: y + 120 - 16 - HIT.min, width: 150,
      label: this.answered || step.kind === "callout" ? "NEXT" : "CHECK",
      variant: "primary",
      onClick: () => (step.kind === "callout" ? this.advance() : this.commit()),
    });
    this.add2(next.container);
  }

  /** FS5: completion, first intel card, first credits. */
  private renderComplete(): void {
    this.cameras.main.setBackgroundColor(hex("#05080D"));

    const head = capsLabel(this, 0, 110, "FLIGHT SCHOOL COMPLETE", C.hud);
    head.setX((CANVAS.width - head.width) / 2);
    const title = this.add.text(0, 140, "CLEARED FOR SORTIES", { ...TEXT.h1 });
    title.setLetterSpacing(TRACK.display * SIZE.h1);
    title.setX((CANVAS.width - title.width) / 2);
    this.add2(head, title);

    // The first intel card and the first credits are awarded once. Flight
    // school is always flown in the trainer, so this one is the T-38 and not
    // gameState.currentAirframe().
    const airframe = gameState.file.unlockedAirframes[0] ?? "t38";
    const card = dossier(airframe)?.cards[0];
    const already = (gameState.file.intelCards[airframe] ?? []).includes(1);
    if (!already && card) {
      gameState.update({
        ...gameState.file,
        credits: gameState.file.credits + 100,
        intelCards: { ...gameState.file.intelCards, [airframe]: [1] },
        flightSchoolDone: true,
      });
    }

    if (card) {
      const w = 520;
      const x = (CANVAS.width - w) / 2;
      const y = 230;
      this.add2(panel(this, x, y, w, 150, { fill: C.panel, border: C.lock }));
      this.add2(capsLabel(this, x + 16, y + 14, "T-38 · 01   FIRST CARD", C.lock, TRACK.readout));
      const t = this.add.text(x + 16, y + 42, card.title, { ...TEXT.h3, fontSize: "18px" });
      const b = this.add.text(x + 16, y + 72, card.body, {
        ...TEXT.body, color: C.textMuted, wordWrap: { width: w - 32 }, lineSpacing: 2,
      });
      this.add2(t, b);
    }

    const credits = capsLabel(this, 0, 400, `CREDITS +100 · ${gameState.file.credits} CR`, C.lock);
    credits.setX((CANVAS.width - credits.width) / 2);
    this.add2(credits);

    const first = CH1_MISSIONS[0]!;
    const go = button(this, {
      x: (CANVAS.width - 320) / 2, y: 450, width: 320, height: HIT.lg,
      label: `TO THE BRIEFING · ${first.name}`, variant: "primary",
      onClick: () => this.scene.start("Briefing", { unitId: "ch1", missionId: first.id }),
    });
    const hangar = button(this, {
      x: (CANVAS.width - 320) / 2, y: 450 + HIT.lg + 12, width: 320,
      label: "HANGAR", variant: "ghost", onClick: () => this.scene.start("Hangar"),
    });
    this.add2(go.container, hangar.container);
  }
}
