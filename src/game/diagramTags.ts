// What a diagram series is called, if anything.
//
// Kept apart from the Phaser renderers so it can be tested without a browser.

/**
 * The tag a diagram series carries.
 *
 * Series are already told apart by line style and point fill as well as colour,
 * so the default needs no tags. The colorblind-safe setting names them A and B
 * even where the card did not: that is the "shapes and labels" the toggle
 * promises, and it costs nothing when the default already passes.
 */
export function seriesTag(labels: readonly string[] | undefined, i: number, colorblind: boolean): string | null {
  if (labels?.[i]) return labels[i]!;
  return colorblind ? String.fromCharCode(65 + i) : null;
}