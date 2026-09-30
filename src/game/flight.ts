// The arcade flight model, in one place.
//
// It began inside SortieScene and Flight School only pretended to teach it. Both
// need the same numbers, and a lesson that flies differently from the sortie is
// worse than no lesson, so the model lives here and both scenes step it.
//
// Arcade, not a simulator: the stick steers a heading and the aircraft always
// moves forward, which is what an intercept needs. Forward is always up the
// screen and the camera rides with the aircraft, so a turn shows as the world
// sliding rather than the aircraft rotating.

/** Degrees per second at full deflection. */
export const TURN_RATE = 75;
/** Forward, always. The aircraft never flies backwards down its own track. */
export const SPEED = 190; // pixels per second
/** Sideways, at full bank. Enough to line up on a bogey without overshooting. */
export const STRAFE = 150; // pixels per second
/** How far the sprite rolls at full deflection. A cue, not part of the model. */
export const BANK_ANGLE = 22; // degrees
/** How much of its wingspan the airframe loses when rolled right over. */
export const BANK_FORESHORTEN = 0.2;
/** Seconds-ish constant for the roll easing in and out; higher is snappier. */
export const BANK_RATE = 7;

/** Display size every scene draws the player sprite at. */
export const PLAYER_W = 85;
export const PLAYER_H = 120;

/** The state the model carries: a compass heading and how far it is rolled. */
export interface Flight {
  /** compass heading in degrees; 0 is north, which is up the screen */
  heading: number;
  /** −1 rolled fully left, +1 fully right; eases toward the stick */
  bank: number;
}

export function newFlight(): Flight {
  return { heading: 0, bank: 0 };
}

/** How far the world moves for this step: x with the bank, y always forward. */
export interface FlightStep {
  dx: number;
  dy: number;
}

/**
 * Step the model one frame. Mutates `f` and returns the world delta, which is
 * the same delta the player, the contacts, and the terrain all take.
 *
 * @param turn −1, 0 or +1: the stick position.
 */
export function stepFlight(f: Flight, turn: number, dt: number): FlightStep {
  if (turn !== 0) f.heading = (f.heading + turn * TURN_RATE * dt + 360) % 360;
  f.bank += (turn - f.bank) * Math.min(1, dt * BANK_RATE);
  return { dx: -f.bank * STRAFE * dt, dy: SPEED * dt };
}