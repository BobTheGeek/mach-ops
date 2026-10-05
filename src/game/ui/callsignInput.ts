// The native-keyboard callsign field: an off-screen text input a tablet can
// focus so its own keyboard opens. The game still draws the line and caret;
// this element exists only because a canvas cannot raise an OS keyboard.
//
// The input filters as it types, by the same rule the desktop key handler
// applies: capitals, letters/digits/space/dash, twelve characters. Enter
// commits and Escape cancels. Blur deliberately does not cancel — tapping
// COMMIT blurs the field before the tap reaches the button.

import { isCallsignChar, MAX_CALLSIGN } from "../save";

export interface NativeEntryOpts {
  initial: string;
  onDraft(draft: string): void;
  onCommit(draft: string): void;
  onCancel(): void;
}

/** A raw value reduced to a callsign: allowed characters, capitals, capped. */
function filterCallsign(raw: string): string {
  let out = "";
  for (const ch of raw) {
    if (out.length >= MAX_CALLSIGN) break;
    if (isCallsignChar(ch)) out += ch.toUpperCase();
  }
  return out;
}

/**
 * Mount one off-screen input. The caller owns its lifetime: focus it from a
 * user gesture to raise the keyboard, destroy it when the editor closes.
 */
export function attachNativeEntry(o: NativeEntryOpts): { focus(): void; destroy(): void } {
  const input = document.createElement("input");
  input.type = "text";
  // Never display:none: iOS refuses to focus that.
  input.style.cssText =
    "position: fixed; opacity: 0; width: 1px; height: 1px; border: 0; padding: 0; font-size: 16px;";
  input.setAttribute("autocapitalize", "characters");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("autocorrect", "off");
  input.setAttribute("spellcheck", "false");
  input.setAttribute("enterkeyhint", "done");
  input.maxLength = MAX_CALLSIGN;

  let draft = filterCallsign(o.initial);
  input.value = draft;

  const onInput = (): void => {
    draft = filterCallsign(input.value);
    if (input.value !== draft) input.value = draft;
    o.onDraft(draft);
  };
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Enter") { e.preventDefault(); o.onCommit(draft); return; }
    if (e.key === "Escape") { e.preventDefault(); o.onCancel(); }
  };

  input.addEventListener("input", onInput);
  input.addEventListener("keydown", onKeyDown);
  document.body.append(input);

  return {
    focus: () => input.focus(),
    destroy: () => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("keydown", onKeyDown);
      input.remove();
    },
  };
}
