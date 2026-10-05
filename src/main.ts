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
import { MedalAwardScene } from "./game/scenes/MedalAwardScene";
import { FleetScene } from "./game/scenes/FleetScene";
import { ProfileScene } from "./game/scenes/ProfileScene";
import { ManualLibraryScene } from "./game/scenes/ManualLibraryScene";
import { CampaignScene } from "./game/scenes/CampaignScene";
import { DossierScene } from "./game/scenes/DossierScene";
import { HowToPlayScene } from "./game/scenes/HowToPlayScene";
import { PauseScene } from "./game/scenes/PauseScene";
import { FlightSchoolScene } from "./game/scenes/FlightSchoolScene";
import { SettingsScene } from "./game/scenes/SettingsScene";
import { ShopScene } from "./game/scenes/ShopScene";
import { music, trackFor } from "./game/music";
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
    DebriefScene, UnlockScene, MedalAwardScene, FleetScene, ProfileScene, ManualLibraryScene, DossierScene, HowToPlayScene, PauseScene, FlightSchoolScene, SettingsScene, ShopScene,
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
  const applyTrack = (scene: Phaser.Scene): void => {
    const track = trackFor(scene.scene.key, scene.sys.settings.data);
    if (track) music.play(track, gameState.file.settings.volume);
    else music.stop();
  };
  for (const scene of game.scene.scenes) {
    scene.events.on(Phaser.Scenes.Events.CREATE, () => applyTrack(scene));
    // A resumed scene never re-fires CREATE, so without this the menu track a
    // settings overlay started would keep playing over the sortie underneath.
    scene.events.on(Phaser.Scenes.Events.RESUME, () => applyTrack(scene));
  }
});

window.addEventListener("pointerdown", () => music.resume());
window.addEventListener("keydown", () => music.resume());

/* ------------------------------------------------------------ touch shell */

// Browser chrome has no place over the cockpit: a right-click on the canvas
// should not open the long-press menu, and a two-finger pinch should not zoom
// the page under the game. The canvas alone is covered, so a right-click beside
// it still reaches devtools.
game.canvas.addEventListener("contextmenu", (event) => event.preventDefault());

// WebKit fires gesturestart for a pinch; Chrome never fires it at all, so the
// feature check keeps other engines from registering a listener they can't run.
if ("ongesturestart" in game.canvas) {
  game.canvas.addEventListener("gesturestart", (event) => event.preventDefault());
}

// A coarse pointer in portrait is a tablet held the wrong way. Sleeping the
// TimeStep stops update and render outright, so the sortie behind the overlay
// cannot progress; waking on landscape resumes exactly where it stopped.
//
// The canvas exists as soon as the Game is constructed, but its TimeStep only
// starts once textures have loaded, so a sleep() here would be a no-op at
// startup. The first STEP is the earliest the loop can be stopped; re-checking
// on each step keeps the portrait gate authoritative over anything else that
// might resume the loop.
const portrait = window.matchMedia("(orientation: portrait) and (pointer: coarse)");
const applyOrientation = (isPortrait: boolean): void => {
  if (isPortrait) game.loop.sleep();
  else game.loop.wake();
};
game.events.on(Phaser.Core.Events.STEP, () => {
  if (portrait.matches) game.loop.sleep();
});
const onPortraitChange = (event: { matches: boolean }): void => applyOrientation(event.matches);
if (typeof portrait.addEventListener === "function") {
  portrait.addEventListener("change", onPortraitChange);
} else {
  // iPadOS < 14 predates EventTarget on MediaQueryList; the legacy call hands
  // the list itself to the callback, which still carries the same matches flag.
  portrait.addListener(onPortraitChange);
}

// Dev-only handle so a QA script can jump straight to a scene instead of
// clicking the whole funnel. Stripped from production builds.
if (import.meta.env.DEV) {
  (globalThis as unknown as { __machops?: Phaser.Game }).__machops = game;
}
