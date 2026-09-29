// FT1-FT3 first-time tips: one component, three placements, each shown once.
//
// tokens.audio.cues.tipAppear is silent by design, so a tip never makes a sound.
// Dismissing one records it in the save; Settings can clear the record.

import Phaser from "phaser";
import { C, SIZE, TEXT, TRACK, HIT, MOTION } from "../../ui/tokens";
import { panel, capsLabel, button } from "./kit";
import { gameState } from "../state";
import { seeTip } from "../save";

export type TipId = "FT1" | "FT2" | "FT3" | "FT4";

interface TipSpec {
  badge: string;
  title: string;
  body: string;
}

export const TIPS: Record<TipId, TipSpec> = {
  FT1: {
    badge: "★ SPECIAL",
    title: "TRANSFER PROBLEM",
    body: "This one mixes two skills. It counts extra toward mastery, and a skill needs two of them correct before it can reach OPTIMIZED.",
  },
  FT2: {
    badge: "BOSS SORTIE",
    title: "MIXED REVIEW",
    body: "A boss sortie reviews the whole unit. Failing it keeps every bit of progress you have made.",
  },
  FT3: {
    badge: "QUICK MISS",
    title: "WORKED EXAMPLE",
    body: "A wrong answer inside the fast ring pops the worked example in. Read it, then the same problem comes back.",
  },
  FT4: {
    badge: "NEW INPUT",
    title: "THE GRID IS THE ANSWER",
    body: "Tap the grid to put your answer on it, or move it with the arrow keys. Space swaps which end of a line you are holding. ENTER commits it, same as always.",
  },
};

export function shouldShowTip(id: TipId): boolean {
  return !gameState.file.tipsSeen.includes(id);
}

/**
 * Show a tip once. Returns the container, or null when it has already been seen.
 * The caller positions it; the tip dismisses itself and records that it was seen.
 */
export function showTip(
  scene: Phaser.Scene,
  id: TipId,
  x: number,
  y: number,
  onDismiss?: () => void,
): Phaser.GameObjects.Container | null {
  if (!shouldShowTip(id)) return null;
  const spec = TIPS[id];

  const w = 380;
  const items: Phaser.GameObjects.GameObject[] = [];
  const frame = panel(scene, 0, 0, w, 150, { fill: C.panelRaised, border: C.lock });
  items.push(frame);

  const badge = capsLabel(scene, 14, 12, spec.badge, C.lock, TRACK.readout);
  const title = scene.add.text(14, 12 + SIZE.label + 6, spec.title, { ...TEXT.h3, fontSize: "18px" });
  const body = scene.add.text(14, title.y + title.height + 4, spec.body, {
    ...TEXT.body, fontSize: "15px", color: C.textMuted, wordWrap: { width: w - 28 }, lineSpacing: 2,
  });
  items.push(badge, title, body);

  const container = scene.add.container(x, y, items);

  const dismiss = (): void => {
    gameState.update(seeTip(gameState.file, id));
    if (gameState.file.settings.reducedMotion) { container.destroy(true); onDismiss?.(); return; }
    scene.tweens.add({
      targets: container,
      alpha: 0,
      duration: 200, // the artboard's "tip fades 200 ms"
      onComplete: () => { container.destroy(true); onDismiss?.(); },
    });
  };

  const close = button(scene, {
    x: w - 14 - HIT.min, y: 150 - 14 - HIT.min, width: HIT.min,
    label: "✕", variant: "ghost", onClick: dismiss,
  });
  container.add(close.container);

  // Slides in like a card, never with a sound.
  if (!gameState.file.settings.reducedMotion) {
    container.setAlpha(0);
    container.setY(y + MOTION.cardSlideIn.offsetPx);
    scene.tweens.add({
      targets: container,
      alpha: 1,
      y,
      duration: MOTION.cardSlideIn.duration,
      ease: "Cubic.easeIn",
    });
  }

  return container;
}
