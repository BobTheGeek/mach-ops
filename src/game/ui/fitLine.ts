// Fit a single line of label segments into a pixel budget.
//
// The campaign board's detail line carries more than fits on the longest cards
// — a boss's "BOSS · MIXED REVIEW · 12 PROBLEMS · ~2 MIN · 3 PREP" is about
// 500 px against roughly 333 px of room — and a single-line label has no word
// wrap to save it, so it ran out of its card. This drops the least valuable
// segments (lowest priority first, rightmost on ties) until the line fits, and
// truncates only when even one segment cannot.

export interface DetailPart {
  text: string;
  /** lower priority is dropped first when the line does not fit */
  priority: number;
}

const SEP = " · ";

/**
 * Join the parts so the result is no wider than `room` pixels.
 *
 * `widthOf` measures a candidate in the render font. The highest-priority part
 * is never dropped; as a last resort it is truncated with an ellipsis.
 */
export function fitLine(
  parts: readonly DetailPart[],
  room: number,
  widthOf: (s: string) => number,
  sep = SEP,
): string {
  let kept = [...parts];

  while (kept.length > 1) {
    const line = kept.map((p) => p.text).join(sep);
    if (widthOf(line) <= room) return line;
    // Drop the lowest priority; on a tie the rightmost gives way, so the
    // earlier (more important) segments survive.
    let drop = 0;
    for (let i = 1; i < kept.length; i++) {
      if (kept[i]!.priority <= kept[drop]!.priority) drop = i;
    }
    kept = kept.filter((_, i) => i !== drop);
  }

  const only = kept[0];
  if (!only) return "";
  if (widthOf(only.text) <= room) return only.text;

  let out = only.text;
  while (out.length > 1 && widthOf(`${out}…`) > room) out = out.slice(0, -1);
  return `${out}…`;
}
