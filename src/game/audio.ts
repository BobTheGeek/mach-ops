// Avionics audio. Every cue in design/tokens.json -> audio.cues is synthesised
// here rather than shipped as a file: the spec asks for "synth-style avionics
// tones", and a Chromebook that has not downloaded an asset still gets sound.
//
// Rules the engine enforces for you:
//   - master volume comes from settings; the context is silent at volume 0
//   - world audio ducks 50% under bullet-time (tokens.audio.notes)
//   - tipAppear is silent by design, so it plays nothing
//   - haptics fire only where the device supports vibration
//
// A browser will not start an AudioContext before a user gesture, so the engine
// stays unbuilt until the first cue after one and never throws if that fails.

import { AUDIO } from "../ui/tokens";

export type Cue = keyof typeof AUDIO.cues;

/** Cues that are allowed to sound while a problem card is up. */
export const CARD_CUES: ReadonlySet<Cue> = new Set(["keyTick", "hit", "hitFast", "miss"] as Cue[]);

/** tokens.audio.notes: world audio ducks 50% under bullet-time. */
export const DUCK = 0.5;

/** tokens.audio.cues.streakTick: one semitone per streak, capped at 12. */
export const STREAK_CAP = 12;

interface Env {
  /** seconds */
  attack?: number;
  decay: number;
  peak?: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private volume = 0.7;
  private ducked = false;
  private failed = false;

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    this.applyGain();
  }

  /** Called on bullet-time in and out. */
  setDucked(ducked: boolean): void {
    this.ducked = ducked;
    this.applyGain();
  }

  private applyGain(): void {
    if (!this.master || !this.ctx) return;
    const target = this.volume * (this.ducked ? DUCK : 1);
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
  }

  /** Builds the context lazily; safe to call before any user gesture. */
  private ensure(): AudioContext | null {
    if (this.failed) return null;
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    }
    try {
      const Ctor = globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) { this.failed = true; return null; }
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      return this.ctx;
    } catch {
      this.failed = true;
      return null;
    }
  }

  /* ------------------------------------------------------- primitives */

  private tone(freqFrom: number, freqTo: number, ms: number, type: OscillatorType, env: Env): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, t);
    if (freqTo !== freqFrom) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t + ms / 1000);

    const peak = env.peak ?? 0.25;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + (env.attack ?? 0.004));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + env.decay);

    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + env.decay + 0.02);
  }

  private noise(ms: number, filterHz: number, sweepTo: number | null, peak = 0.12): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    const frames = Math.max(1, Math.floor((ctx.sampleRate * ms) / 1000));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Deterministic noise: a tiny LCG, so no Math.random anywhere in the build.
    let seed = 0x2545f491;
    for (let i = 0; i < frames; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = (seed / 0xffffffff) * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(filterHz, t);
    if (sweepTo !== null) filter.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), t + ms / 1000);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peak, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);

    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
    src.stop(t + ms / 1000 + 0.02);
  }

  private haptic(pattern: number | number[]): void {
    try {
      navigator.vibrate?.(pattern);
    } catch {
      // Touchpad Chromebooks have no vibration; listed in tokens for parity only.
    }
  }

  /* ------------------------------------------------------------ cues */

  /**
   * @param streak used only by streakTick, which steps up a semitone per streak.
   */
  play(cue: Cue, streak = 0): void {
    if (this.volume <= 0) return;

    switch (cue) {
      case "lockAcquire":                       // rising two-tone 440 -> 880, 180 ms
        this.tone(440, 880, 180, "square", { decay: 0.18, peak: 0.18 });
        this.haptic(20);
        break;
      case "bulletTimeIn":                      // low pass sweep down, 150 ms
        this.noise(150, 1800, 200, 0.10);
        break;
      case "keyTick":                           // click 4 ms, 1 kHz
        this.tone(1000, 1000, 4, "square", { decay: 0.02, peak: 0.08 });
        break;
      case "hit":                               // confirm chirp 660 -> 990, 120 ms
        this.tone(660, 990, 120, "triangle", { decay: 0.14, peak: 0.22 });
        this.haptic(20);
        break;
      case "hitFast":                           // hit plus a shimmer tail, 300 ms
        this.tone(660, 990, 120, "triangle", { decay: 0.14, peak: 0.22 });
        this.tone(1320, 1980, 300, "sine", { decay: 0.3, peak: 0.10 });
        this.haptic([20, 40, 20]);
        break;
      case "bogeySplash": {                     // debris burst + low thud, 600 ms
        // Three layers: the crack of it going, the debris, and the thud that
        // falls away underneath. Synthesised like every other cue, so a
        // Chromebook that downloaded nothing still hears the kill.
        this.tone(900, 180, 90, "square", { decay: 0.09, peak: 0.18 });
        this.noise(600, 2600, 180, 0.16);
        this.tone(140, 50, 600, "sawtooth", { decay: 0.6, peak: 0.2 });
        this.haptic(120);
        break;
      }
      case "miss":                              // flat buzz 180 Hz, 200 ms
        this.tone(180, 180, 200, "sawtooth", { decay: 0.2, peak: 0.18 });
        this.haptic(60);
        break;
      case "shieldDrain":                       // descending hiss, 400 ms
        this.noise(400, 2400, 300, 0.09);
        break;
      case "lockBreak":                         // snap plus static, 240 ms
        this.tone(900, 120, 80, "square", { decay: 0.08, peak: 0.16 });
        this.noise(240, 3000, 600, 0.08);
        break;
      case "streakTick": {                      // one semitone per streak, cap 12
        const steps = Math.min(streak, STREAK_CAP);
        const base = 523.25;                    // C5
        const freq = base * Math.pow(2, steps / 12);
        this.tone(freq, freq, 120, "sine", { decay: 0.14, peak: 0.14 });
        break;
      }
      case "bingoWarn":                         // two beeps at 1.2 kHz
        this.tone(1200, 1200, 90, "square", { decay: 0.09, peak: 0.16 });
        globalThis.setTimeout(() => this.tone(1200, 1200, 90, "square", { decay: 0.09, peak: 0.16 }), 150);
        this.haptic([30, 120, 30]);
        break;
      case "flameOut":                          // engine wind-down, 1.2 s
        this.tone(320, 60, 1200, "sawtooth", { decay: 1.2, peak: 0.16 });
        this.haptic(200);
        break;
      case "refuelConnect":                     // metallic latch, 80 ms
        this.tone(1400, 700, 80, "square", { decay: 0.08, peak: 0.14 });
        this.haptic(20);
        break;
      case "waypoint":                          // soft ping 900 Hz, 90 ms
        this.tone(900, 900, 90, "sine", { decay: 0.12, peak: 0.14 });
        break;
      case "unlockReveal": {                    // sustained chord swell, 1.2 s
        for (const f of [261.63, 329.63, 392.0, 523.25]) {
          this.tone(f, f, 1200, "sine", { attack: 0.25, decay: 1.2, peak: 0.09 });
        }
        this.haptic([20, 60, 20, 60, 20]);
        break;
      }
      case "intelCard":                         // paper flip plus chime
        this.noise(90, 5000, 1200, 0.07);
        globalThis.setTimeout(() => this.tone(1046.5, 1568, 260, "sine", { decay: 0.26, peak: 0.14 }), 80);
        break;
      case "uiMove":                            // tick 2 ms
        this.tone(1500, 1500, 2, "square", { decay: 0.015, peak: 0.05 });
        break;
      case "uiConfirm":                         // click 10 ms
        this.tone(880, 880, 10, "square", { decay: 0.03, peak: 0.10 });
        break;
      case "uiBack":                            // lower click 10 ms
        this.tone(440, 440, 10, "square", { decay: 0.03, peak: 0.10 });
        break;
      case "manualOpen":                        // page turn, never a penalty tone
        this.noise(120, 3200, 900, 0.06);
        break;
      case "tipAppear":                         // silent by design
        break;
    }
  }
}

/** One engine per page load. */
export const audio = new AudioEngine();
