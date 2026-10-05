// Touch controls for tablets.
//
// Pure helpers with no Phaser imports: the scene owns the listeners, these
// own the arithmetic, so the merge and hold rules can be tested headlessly.

/** True when the device reports a touch screen. */
export function touchMode(): boolean {
  return typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
}

/** Keyboard and touch steering, summed and clamped to full deflection. */
export function mergeTurn(keyboard: number, touch: number): -1 | 0 | 1 {
  const sum = keyboard + touch;
  if (sum > 0) return 1;
  if (sum < 0) return -1;
  return 0;
}

/** Which on-screen steering paddles are held down. */
export interface HoldState {
  left: boolean;
  right: boolean;
}

export const NO_HOLD: HoldState = { left: false, right: false };

export type HoldEvent = "left-down" | "left-up" | "right-down" | "right-up" | "release-all";

/** The next hold state after one paddle event; release-all clears both. */
export function applyHold(state: HoldState, event: HoldEvent): HoldState {
  switch (event) {
    case "left-down":
      return { left: true, right: state.right };
    case "left-up":
      return { left: false, right: state.right };
    case "right-down":
      return { left: state.left, right: true };
    case "right-up":
      return { left: state.left, right: false };
    case "release-all":
      return NO_HOLD;
  }
}

/** Held paddles as a turn: one side banks, both sides fly level. */
export function holdTurn(state: HoldState): -1 | 0 | 1 {
  return state.right && !state.left ? 1 : state.left && !state.right ? -1 : 0;
}
