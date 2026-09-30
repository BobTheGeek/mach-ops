// The pilot's naming prompt: a modal the title raises while the file still
// carries the default callsign. It asks on every launch until a real name is
// committed, because the profile's CHANGE CALLSIGN button is too easy to never
// find (KICKOFF: the pilot is named, not left as MAVERICK forever).
//
// LATER only closes it for that session — nothing is written, so the next
// launch asks again. The entry mirrors ProfileScene's editor: capitals, the
// same allowed characters, the same twelve-character cap, ENTER commits and
// ESC is a way out.

import Phaser from "phaser";
import { C, HIT, MOTION, SIZE, TEXT, TRACK, CANVAS, hex } from "../../ui/tokens";
import { panel, capsLabel, button, dim } from "./kit";
import { gameState } from "../state";
import { isCallsignChar, needsPilotName, setCallsign, MAX_CALLSIGN } from "../save";
import { audio } from "../audio";

const W = 560;
const H = 340;

export interface CallsignPromptOpts {
  /** True when a callsign was committed, false when the pilot chose LATER. */
  onClose?: (confirmed: boolean) => void;
}

/**
 * Raise the prompt, or return null when the pilot already has a real name.
 * The caller keeps its own screen still while this is up; the scrim swallows
 * clicks and the caller defers any keyboard shortcut it owns.
 */
export function showCallsignPrompt(
  scene: Phaser.Scene,
  opts: CallsignPromptOpts = {},
): Phaser.GameObjects.Container | null {
  if (!needsPilotName(gameState.file)) return null;

  const x = (CANVAS.width - W) / 2;
  const y = (CANVAS.height - H) / 2;

  const scrim = dim(scene);

  const items: Phaser.GameObjects.GameObject[] = [];
  items.push(panel(scene, 0, 0, W, H, { fill: C.panelRaised, border: C.lock }));

  const badge = capsLabel(scene, 24, 20, "PILOT REGISTRY", C.lock, TRACK.readout);
  const title = scene.add.text(24, 20 + SIZE.label + 8, "NAME YOUR PILOT", { ...TEXT.h2 });
  title.setLetterSpacing(TRACK.display * SIZE.h2);
  items.push(badge, title);

  const body = scene.add.text(24, title.y + title.height + 8, "Every sortie in the log flies under your callsign. Give your pilot a name.", {
    ...TEXT.body, color: C.textMuted, wordWrap: { width: W - 48 }, lineSpacing: 2,
  });
  items.push(body);

  const labelY = body.y + body.height + 18;
  items.push(capsLabel(scene, 24, labelY, "CALLSIGN", C.textMuted, TRACK.readout));
  const callsignText = scene.add.text(24, labelY + SIZE.label + 6, "", { ...TEXT.h3, color: C.hud });
  callsignText.setLetterSpacing(TRACK.display * SIZE.h3);
  items.push(callsignText);

  const caret = scene.add.rectangle(callsignText.x + 3, callsignText.y + 14, 2, 22, hex(C.hud)).setOrigin(0, 0.5);
  items.push(caret);
  scene.tweens.add({ targets: caret, alpha: 0, duration: 500, yoyo: true, repeat: -1 });

  const confirm = button(scene, {
    x: 24, y: H - 24 - HIT.lg, width: 220, height: HIT.lg,
    label: "CONFIRM CALLSIGN", variant: "disabled", onClick: () => commit(),
  });
  const later = button(scene, {
    x: W - 24 - 140, y: H - 24 - HIT.lg, width: 140, height: HIT.lg,
    label: "LATER", variant: "ghost", onClick: () => close(false),
  });
  items.push(confirm.container, later.container);

  const container = scene.add.container(x, y, items);

  let draft = "";
  let editing = true;

  const drawEntry = (): void => {
    callsignText.setText(draft);
    caret.setX(callsignText.x + callsignText.width + 3);
    confirm.setVariant(draft.length > 0 ? "primary" : "disabled");
  };

  const commit = (): void => {
    gameState.update(setCallsign(gameState.file, draft));
    close(true);
  };

  const close = (confirmed: boolean): void => {
    editing = false;
    window.removeEventListener("keydown", keyHandler);
    scene.tweens.killTweensOf(caret);
    scrim.destroy();
    container.destroy(true);
    opts.onClose?.(confirmed);
  };

  const keyHandler = (e: KeyboardEvent): void => {
    if (!editing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      if (draft.length > 0) commit();
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); close(false); return; }
    if (e.key === "Backspace") { e.preventDefault(); draft = draft.slice(0, -1); }
    else if (isCallsignChar(e.key) && draft.length < MAX_CALLSIGN) {
      e.preventDefault();
      draft += e.key.toUpperCase();
    } else return;
    audio.play("keyTick");
    drawEntry();
  };
  window.addEventListener("keydown", keyHandler);
  drawEntry();

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
