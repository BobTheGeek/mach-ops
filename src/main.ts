// Mach Ops entry point. 1280x720, Chromebook target.

import Phaser from "phaser";
import { CANVAS, N } from "./ui/tokens";
import { BootScene } from "./game/scenes/BootScene";
import { TitleScene } from "./game/scenes/TitleScene";
import { HangarScene } from "./game/scenes/HangarScene";
import { BriefingScene } from "./game/scenes/BriefingScene";
import { SortieScene } from "./game/scenes/SortieScene";
import { DebriefScene } from "./game/scenes/DebriefScene";
import { UnlockScene } from "./game/scenes/UnlockScene";
import { FleetScene } from "./game/scenes/FleetScene";
import { ProfileScene } from "./game/scenes/ProfileScene";
import { ManualLibraryScene } from "./game/scenes/ManualLibraryScene";
import { CampaignScene } from "./game/scenes/CampaignScene";
import { DossierScene } from "./game/scenes/DossierScene";
import { HowToPlayScene } from "./game/scenes/HowToPlayScene";
import { PauseScene } from "./game/scenes/PauseScene";
import { FlightSchoolScene } from "./game/scenes/FlightSchoolScene";
import { SettingsScene } from "./game/scenes/SettingsScene";
import { music, SCENE_TRACK } from "./game/music";
import { gameState } from "./game/state";

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
  scene: [
    BootScene, TitleScene, HangarScene, CampaignScene, BriefingScene, SortieScene,
    DebriefScene, UnlockScene, FleetScene, ProfileScene, ManualLibraryScene, DossierScene, HowToPlayScene, PauseScene, FlightSchoolScene, SettingsScene,
  ],
});

/**
 * Music follows the scene, decided in one place.
 *
 * Every scene is instantiated when the game boots, so each one's own CREATE
 * event can be listened to here rather than have fourteen scenes each remember
 * to start and stop a track. A scene missing from SCENE_TRACK stops the music,
 * which is how the sortie stays silent.
 *
 * A browser will not start audio before the page has been touched, so the first
 * pointer or key anywhere resumes whatever is meant to be playing.
 */
// Attached on READY, not straight after the constructor: Phaser boots
// asynchronously, so game.scene.scenes is still empty at that point and the
// listeners went nowhere.
game.events.once(Phaser.Core.Events.READY, () => {
  for (const scene of game.scene.scenes) {
    scene.events.on(Phaser.Scenes.Events.CREATE, () => {
      const track = SCENE_TRACK[scene.scene.key];
      if (track) music.play(track, gameState.file.settings.volume);
      else music.stop();
    });
  }
});

window.addEventListener("pointerdown", () => music.resume());
window.addEventListener("keydown", () => music.resume());

// Dev-only handle so a QA script can jump straight to a scene instead of
// clicking the whole funnel. Stripped from production builds.
if (import.meta.env.DEV) {
  (globalThis as unknown as { __machops?: Phaser.Game }).__machops = game;
}
