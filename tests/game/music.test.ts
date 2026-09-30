import { describe, it, expect } from "vitest";
import { SCENE_TRACK, trackFor, THEME, MENU, SORTIE, MUSIC_GAIN, DUCK } from "../../src/game/music";

/**
 * The scene keys the game registers, from src/main.ts. Kept here as a literal so
 * a scene added without a music decision shows up as a failure rather than as
 * silence nobody notices.
 */
const SCENES = [
  "Boot", "Title", "Hangar", "Campaign", "Briefing", "Sortie", "Debrief",
  "Unlock", "Fleet", "Profile", "ManualLibrary", "Dossier", "HowToPlay",
  "Pause", "FlightSchool", "Settings", "Shop",
];

describe("which scene plays what", () => {
  it("opens on the title theme", () => {
    expect(SCENE_TRACK.Title).toBe(THEME);
  });

  it("flies the sortie on its own track", () => {
    expect(SCENE_TRACK.Sortie).toBe(SORTIE);
  });

  // Pause is an overlay launched on top of a running sortie. Give it an entry of
  // its own and the music stops on pause and never comes back, because resuming
  // does not re-create the sortie.
  it("keeps the sortie track running under the pause overlay", () => {
    expect(SCENE_TRACK.Pause).toBe(SCENE_TRACK.Sortie);
  });

  it("plays the menu track on every other screen the player can reach", () => {
    const playable = SCENES.filter((s) => !["Boot", "Title", "Sortie", "Pause"].includes(s));
    for (const s of playable) expect(SCENE_TRACK[s], s).toBe(MENU);
  });

  it("names only scenes the game actually registers", () => {
    for (const key of Object.keys(SCENE_TRACK)) expect(SCENES, key).toContain(key);
  });

  it("points the three tracks at three different files", () => {
    const tracks = [THEME, MENU, SORTIE];
    expect(new Set(tracks).size).toBe(3);
    for (const src of tracks) expect(src).toMatch(/^\/audio\/.+\.mp3$/);
  });

  it("mixes music under the cues rather than over them", () => {
    expect(MUSIC_GAIN).toBeGreaterThan(0);
    expect(MUSIC_GAIN).toBeLessThan(1);
  });

  // A question on a timer has to have his whole attention, so the music gets out
  // of the way rather than merely stepping back.
  it("ducks hard under a problem card", () => {
    expect(DUCK).toBeGreaterThan(0);
    expect(DUCK).toBeLessThan(0.5);
  });
});

describe("trackFor", () => {
  it("gives a scene its own track when it is not an overlay", () => {
    expect(trackFor("Settings")).toBe(MENU);
    expect(trackFor("Sortie")).toBe(SORTIE);
    expect(trackFor("Title")).toBe(THEME);
  });

  it("says nothing for a scene with no decision", () => {
    expect(trackFor("Boot")).toBeNull();
    expect(trackFor("NotAScene")).toBeNull();
  });

  // The manual, settings and how-to-play are menu screens in their own right,
  // but opened over a paused sortie they are part of that sortie. Switching to
  // the menu track there would never be undone: resuming a scene does not
  // re-create it, so nothing would restart the sortie track.
  it("borrows the host track when launched as an overlay", () => {
    expect(trackFor("Settings", { resumeTo: "Pause" })).toBe(SORTIE);
    expect(trackFor("Manual", { resumeTo: "Sortie" })).toBe(SORTIE);
    expect(trackFor("HowToPlay", { resumeTo: "Pause" })).toBe(SORTIE);
  });

  it("ignores junk data rather than throwing", () => {
    expect(trackFor("Settings", { resumeTo: 42 })).toBe(MENU);
    expect(trackFor("Settings", { resumeTo: "NotAScene" })).toBe(MENU);
    expect(trackFor("Settings", "not an object")).toBe(MENU);
  });
});
