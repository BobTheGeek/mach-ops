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
/**
 * How far the music drops while a problem card is up.
 *
 * Harder than the 50% the cue engine uses on itself. A question on a timer is
 * the one moment that has to have his whole attention, so the music gets out of
 * the way rather than merely stepping back.
 */
export const DUCK = 0.25;
/** Fade on the way out, so leaving the title is not a hard cut. */
export const FADE_MS = 600;

export class Music {
  private el: HTMLAudioElement | null = null;
  /** the src currently loaded, so the same track is never restarted */
  private playing: string | null = null;
  private volume = 0.7;
  private ducked = false;

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

    // Already on this track: leave it running. Walking hangar to briefing to
    // debrief is one continuous screen to a player, and restarting the music at
    // every door would make it feel like four.
    if (this.el && this.playing === src) {
      this.el.volume = this.gain();
      this.resume();
      return;
    }
    // A different track: fade the old one out from under the new one.
    this.stop();


    const el = document.createElement("audio");
    el.src = src;
    this.playing = src;
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

  /** Is a track actually sounding right now? False while a browser holds it. */
  isPlaying(): boolean {
    return this.el !== null && !this.el.paused;
  }

  setVolume(volume: number): void {
    this.volume = volume;
    if (this.el) this.el.volume = this.gain();
  }

  /** Called on bullet-time in and out, alongside the cue engine's own duck. */
  setDucked(ducked: boolean): void {
    this.ducked = ducked;
    if (this.el) this.el.volume = this.gain();
  }

  /** Fade out and release the element, so nothing plays on into the next scene. */
  stop(): void {
    const el = this.el;
    this.el = null;
    this.playing = null;
    this.ducked = false;
    if (!el) return;

    // The timer belongs to this element, not to the player: a track swap leaves
    // the outgoing one fading while the incoming one is already up.
    const step = 50;
    const drop = el.volume / Math.max(1, FADE_MS / step);
    const timer = setInterval(() => {
      el.volume = Math.max(0, el.volume - drop);
      if (el.volume > 0) return;
      clearInterval(timer);
      el.pause();
      // Release the buffer and the node rather than leave a paused stream behind.
      el.src = "";
      el.remove();
    }, step);
  }

  private gain(): number {
    const v = Math.max(0, Math.min(1, this.volume)) * MUSIC_GAIN;
    return this.ducked ? v * DUCK : v;
  }
}

/**
 * Served from public/, not bundled: a three-minute track has no business inside
 * the JavaScript, and this way it streams while the screen is already up.
 *
 * Both are by Sky Toes, licensed from Uppbeat.
 */
export const THEME = "/audio/theme.mp3";
export const MENU = "/audio/menu.mp3";
export const SORTIE = "/audio/sortie.mp3";

/**
 * Which track each scene plays. A scene missing from this map plays nothing.
 *
 * Pause shares the sortie's track rather than being left out. It is an overlay
 * launched on top of a running sortie, so an entry of its own would stop the
 * music on pause and never start it again: resuming does not re-create the
 * sortie, so nothing would bring it back.
 */
export const SCENE_TRACK: Readonly<Record<string, string>> = {
  Title: THEME,

  Hangar: MENU,
  Campaign: MENU,
  Briefing: MENU,
  Debrief: MENU,
  Unlock: MENU,
  Fleet: MENU,
  Profile: MENU,
  Shop: MENU,
  Dossier: MENU,
  ManualLibrary: MENU,
  HowToPlay: MENU,
  Settings: MENU,
  FlightSchool: MENU,

  Sortie: SORTIE,
  Pause: SORTIE,
};

/** One per page load, like the audio engine. */
export const music = new Music();
