// On-screen touch controls: hold-to-steer paddles plus LOCK and PAUSE taps.
//
// The paddles are hand-drawn rather than kit buttons because button() commits
// on pointerup — right for LOCK and PAUSE, wrong for steering, which must bank
// for as long as a thumb is down. The hold arithmetic lives in ../touch so it
// stays testable without Phaser; this module owns only the drawing and the
// pointer plumbing.

import Phaser from "phaser";
import { C, N, RADIUS, STROKE, HIT, CANVAS, SCREEN_PAD, hex } from "../../ui/tokens";
import { button, type Button } from "./kit";
import { applyHold, holdTurn, NO_HOLD, type HoldEvent, type HoldState } from "../touch";

export interface TouchControlsOpts {
  onTurn(turn: -1 | 0 | 1): void;
  onLock(): void;
  onPause?(): void;
}

export interface TouchControls {
  setLockable(v: boolean): void;
  setVisible(v: boolean): void;
  destroy(): void;
}

/* Layout: the plan's exact control rects, derived from the canvas and tokens.
   Steer paddles 96×96 with a 12 px gap on the bottom-left; LOCK shares the
   bottom row at the right edge; PAUSE is the 56 px square above it. */
const GAP = 12;
const ROW_Y = CANVAS.height - SCREEN_PAD - HIT.touch; // 592
const STEER_LEFT_X = SCREEN_PAD; // 32
const STEER_RIGHT_X = STEER_LEFT_X + HIT.touch + GAP; // 140
const LOCK_X = CANVAS.width - SCREEN_PAD - HIT.touchWide; // 1108
const PAUSE_X = CANVAS.width - SCREEN_PAD - HIT.lg; // 1192
const PAUSE_Y = SCREEN_PAD * 2; // 64

/** One steering paddle: its container, and a repaint for the held state. */
interface Paddle {
  container: Phaser.GameObjects.Container;
  paint(pressed: boolean): void;
}

function paddle(scene: Phaser.Scene, x: number, dir: -1 | 1, emit: (e: HoldEvent) => void): Paddle {
  const down: HoldEvent = dir < 0 ? "left-down" : "right-down";
  const up: HoldEvent = dir < 0 ? "left-up" : "right-up";

  const g = scene.add.graphics();
  const zone = scene.add.zone(0, 0, HIT.touch, HIT.touch).setOrigin(0, 0).setInteractive({ useHandCursor: true });

  // A finger that lifts, slides off, or lifts elsewhere must stop banking.
  zone.on("pointerdown", () => emit(down));
  zone.on("pointerup", () => emit(up));
  zone.on("pointerout", () => emit(up));
  zone.on("pointerupoutside", () => emit(up));

  const paint = (pressed: boolean): void => {
    const s = HIT.touch;
    g.clear();
    g.fillStyle(pressed ? N.hud : N.panelRaised, 1);
    g.fillRoundedRect(0, 0, s, s, RADIUS.input);
    if (!pressed) {
      g.lineStyle(STROKE.hairline, hex(C.border), 1);
      g.strokeRoundedRect(0, 0, s, s, RADIUS.input);
    }

    // The chevron is drawn, not typed: no glyph font can be relied on here.
    const cx = s / 2;
    const cy = s / 2;
    const half = 12;
    const rise = 16;
    g.fillStyle(pressed ? N.ground : N.text, 1);
    if (dir < 0) {
      g.fillTriangle(cx - half, cy, cx + half, cy - rise, cx + half, cy + rise);
    } else {
      g.fillTriangle(cx + half, cy, cx - half, cy - rise, cx - half, cy + rise);
    }
  };
  paint(false);

  return { container: scene.add.container(x, ROW_Y, [g, zone]), paint };
}

export function mountTouchControls(scene: Phaser.Scene, opts: TouchControlsOpts): TouchControls {
  // Two thumbs plus the mouse must never fight over Phaser's default pointer.
  scene.input.addPointer(2);

  const root = scene.add.container(0, 0);

  let state: HoldState = NO_HOLD;
  const update = (event: HoldEvent): void => {
    state = applyHold(state, event);
    opts.onTurn(holdTurn(state));
    left.paint(state.left);
    right.paint(state.right);
  };

  const left = paddle(scene, STEER_LEFT_X, -1, update);
  const right = paddle(scene, STEER_RIGHT_X, 1, update);
  root.add([left.container, right.container]);

  const lock = button(scene, {
    x: LOCK_X,
    y: ROW_Y,
    width: HIT.touchWide,
    height: HIT.touch,
    label: "LOCK",
    variant: "secondary",
    onClick: opts.onLock,
  });
  root.add(lock.container);

  const onPause = opts.onPause;
  let pause: Button | undefined;
  if (onPause) {
    pause = button(scene, {
      x: PAUSE_X,
      y: PAUSE_Y,
      width: HIT.lg,
      height: HIT.lg,
      label: "II",
      variant: "ghost",
      onClick: onPause,
    });
    root.add(pause.container);
  }

  // Failsafe: a finger lifted anywhere — or dragged out of the canvas — can
  // never leave a bank stuck.
  const release = (): void => update("release-all");
  scene.input.on("pointerup", release);
  scene.input.on("gameout", release);

  return {
    setLockable(v) {
      lock.setVariant(v ? "primary" : "secondary");
    },
    setVisible(v) {
      if (!v) update("release-all");
      root.setVisible(v);
    },
    destroy() {
      scene.input.off("pointerup", release);
      scene.input.off("gameout", release);
      lock.destroy();
      pause?.destroy();
      root.destroy();
    },
  };
}
