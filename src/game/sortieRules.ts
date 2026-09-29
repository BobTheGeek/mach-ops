// The numbers the sortie flies by.
//
// Split out of SortieScene so they can be asserted against each other without a
// browser: the boss cone and the lane offsets have to agree, or a boss can put a
// contact on screen that cannot be locked at all.

/** Pixels; SPACE locks the nearest bogey inside this. */
export const LOCK_RANGE = 340;

/**
 * A boss holds a tighter cone.
 *
 * The one rule a boss rule must not break: thinking time stays free. The world
 * is frozen while a card is up, so nothing here touches the maths. What it
 * changes is the flying between questions — a contact has to be flown onto
 * deliberately rather than drifting into range on its own, and a hard turn
 * loses it.
 */
export const BOSS_LOCK_RANGE = 240;

/**
 * Where contacts come in, as an offset from the player's own column.
 *
 * Every one of these must sit inside BOSS_LOCK_RANGE with room to spare, or the
 * boss rule would strand contacts rather than merely press the pilot.
 */
export const LANE_OFFSETS = [-170, 0, 170];
