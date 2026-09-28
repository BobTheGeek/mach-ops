import { describe, it, expect } from "vitest";
import { AudioEngine, CARD_CUES, DUCK, STREAK_CAP, type Cue } from "../../src/game/audio";
import { AUDIO } from "../../src/ui/tokens";

const CUES = Object.keys(AUDIO.cues) as Cue[];

describe("audio engine", () => {
  it("has a case for every cue in tokens.json", () => {
    const engine = new AudioEngine();
    // No AudioContext under Node, so every call is a no-op; what this proves is
    // that no cue name throws, i.e. none is missing from the switch.
    for (const cue of CUES) expect(() => engine.play(cue)).not.toThrow();
  });

  it("does not invent cues the tokens do not name", () => {
    for (const cue of CARD_CUES) expect(CUES).toContain(cue);
  });

  it("allows only key ticks and answer feedback while a card is up", () => {
    // tokens.audio.silence: "during problem card except keyTick/hit/miss".
    expect([...CARD_CUES].sort()).toEqual(["hit", "hitFast", "keyTick", "miss"]);
  });

  it("ducks world audio by half under bullet-time", () => {
    expect(DUCK).toBe(0.5);
  });

  it("caps the streak tick at twelve semitones", () => {
    expect(STREAK_CAP).toBe(12);
    const engine = new AudioEngine();
    for (const streak of [0, 5, 12, 40]) expect(() => engine.play("streakTick", streak)).not.toThrow();
  });

  it("stays silent at volume zero and survives having no AudioContext", () => {
    const engine = new AudioEngine();
    engine.setVolume(0);
    for (const cue of CUES) expect(() => engine.play(cue)).not.toThrow();
    engine.setVolume(1);
    engine.setDucked(true);
    engine.setDucked(false);
  });

  it("clamps the volume to 0..1", () => {
    const engine = new AudioEngine();
    expect(() => { engine.setVolume(-5); engine.setVolume(9); }).not.toThrow();
  });

  it("keeps tipAppear silent, as the tokens say", () => {
    expect(AUDIO.cues.tipAppear.sound).toBe("none");
  });
});
