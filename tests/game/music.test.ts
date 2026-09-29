import { describe, it, expect } from "vitest";
import { SCENE_TRACK, THEME, MENU, MUSIC_GAIN } from "../../src/game/music";

/**
 * The scene keys the game registers, from src/main.ts. Kept here as a literal so
 * a scene added without a music decision shows up as a failure rather than as
 * silence nobody notices.
 */
const SCENES = [
  "Boot", "Title", "Hangar", "Campaign", "Briefing", "Sortie", "Debrief",
  "Unlock", "Fleet", "Profile", "ManualLibrary", "Dossier", "HowToPlay",
  "Pause", "FlightSchool", "Settings",
];

describe("which scene plays what", () => {
  it("opens on the title theme", () => {
    expect(SCENE_TRACK.Title).toBe(THEME);
  });

  // The point of the whole map: the sortie is where the maths happens, and a
  // bed of music under a timed question is one more thing competing for
  // attention. Pause sits on top of a sortie, so it stays quiet too.
  it("leaves the sortie and its pause overlay silent", () => {
    expect(SCENE_TRACK.Sortie).toBeUndefined();
    expect(SCENE_TRACK.Pause).toBeUndefined();
  });

  it("plays the menu track on every other screen the player can reach", () => {
    const playable = SCENES.filter((s) => !["Boot", "Title", "Sortie", "Pause"].includes(s));
    for (const s of playable) expect(SCENE_TRACK[s], s).toBe(MENU);
  });

  it("names only scenes the game actually registers", () => {
    for (const key of Object.keys(SCENE_TRACK)) expect(SCENES, key).toContain(key);
  });

  it("points both tracks at files, not at each other", () => {
    expect(THEME).not.toBe(MENU);
    for (const src of [THEME, MENU]) expect(src).toMatch(/^\/audio\/.+\.mp3$/);
  });

  it("mixes music under the cues rather than over them", () => {
    expect(MUSIC_GAIN).toBeGreaterThan(0);
    expect(MUSIC_GAIN).toBeLessThan(1);
  });
});
