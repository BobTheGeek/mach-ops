// The title theme.
//
// A plain HTMLAudioElement rather than the Web Audio graph in audio.ts. That
// engine exists to synthesise the avionics cues, which are short and need
// sample-accurate shaping; a three-minute track needs none of that and wants
// streaming and a native loop instead. Keeping them apart means the music starts
// playing before the file has finished downloading.
//
// Both obey the same volume setting, so one slider still governs everything.

/** Music sits under the cues: it is a bed, not a voice. */
export const MUSIC_GAIN = 0.45;
/** Fade on the way out, so leaving the title is not a hard cut. */
export const FADE_MS = 600;

export class Music {
  private el: HTMLAudioElement | null = null;
  private volume = 0.7;
  private fade?: ReturnType<typeof setInterval>;

  /**
   * Start the track, looping.
   *
   * The element is put in the document rather than left detached. A detached
   * `new Audio()` plays in most cases, but Chrome skips its preload, so the file
   * was never even fetched until something asked it to play.
   *
   * A browser will also not begin audio before the page has been interacted
   * with, and that refusal arrives as a rejected promise rather than a throw. It
   * is not an error worth surfacing; `resume()` handles it on the first gesture.
   */
  play(src: string, volume: number): void {
    this.volume = volume;
    if (this.el) return;

    const el = document.createElement("audio");
    el.src = src;
    el.loop = true;
    el.preload = "auto";
    el.volume = this.gain();
    el.style.display = "none";
    document.body.append(el);
    this.el = el;

    void el.play().catch(() => { /* waits for a gesture */ });
  }

  /**
   * Call from the first gesture. Safe to call repeatedly: it only acts on an
   * element that is not already playing, so it is not a source of double starts.
   */
  resume(): void {
    if (!this.el || !this.el.paused) return;
    void this.el.play().catch(() => { /* still refused; the next gesture tries */ });
  }

  setVolume(volume: number): void {
    this.volume = volume;
    if (this.el) this.el.volume = this.gain();
  }

  /** Fade out and release the element, so nothing plays on into the next scene. */
  stop(): void {
    const el = this.el;
    this.el = null;
    if (!el) return;

    this.clearFade();
    const step = 50;
    const drop = el.volume / Math.max(1, FADE_MS / step);
    this.fade = setInterval(() => {
      el.volume = Math.max(0, el.volume - drop);
      if (el.volume > 0) return;
      this.clearFade();
      el.pause();
      // Release the buffer and the node rather than leave a paused stream behind.
      el.src = "";
      el.remove();
    }, step);
  }

  private clearFade(): void {
    if (this.fade !== undefined) clearInterval(this.fade);
    this.fade = undefined;
  }

  private gain(): number {
    return Math.max(0, Math.min(1, this.volume)) * MUSIC_GAIN;
  }
}

/**
 * Served from public/, not bundled: a three-minute track has no business inside
 * the JavaScript, and this way it streams while the title screen is already up.
 */
export const THEME = "/audio/theme.mp3";

/** One per page load, like the audio engine. */
export const music = new Music();
