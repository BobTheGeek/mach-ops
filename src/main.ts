// Mach Ops entry point. 1280x720, Chromebook target.

import Phaser from "phaser";
import { CANVAS, N } from "./ui/tokens";
import { BootScene } from "./game/scenes/BootScene";
import { TitleScene } from "./game/scenes/TitleScene";
import { HangarScene } from "./game/scenes/HangarScene";
import { BriefingScene } from "./game/scenes/BriefingScene";
import { SortieScene } from "./game/scenes/SortieScene";
import { DebriefScene } from "./game/scenes/DebriefScene";
import { ManualLibraryScene } from "./game/scenes/ManualLibraryScene";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: CANVAS.width,
  height: CANVAS.height,
  backgroundColor: N.ground,
  // A Chromebook window is rarely exactly 1280x720; fit and letterbox rather
  // than reflow, so every artboard measurement still holds.
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { pixelArt: false, antialias: true },
  scene: [BootScene, TitleScene, HangarScene, BriefingScene, SortieScene, DebriefScene, ManualLibraryScene],
});

// Dev-only handle so a QA script can jump straight to a scene instead of
// clicking the whole funnel. Stripped from production builds.
if (import.meta.env.DEV) {
  (globalThis as unknown as { __machops?: Phaser.Game }).__machops = game;
}
