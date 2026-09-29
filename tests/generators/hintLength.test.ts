import { describe, it, expect } from "vitest";
import { generatorFor, IMPLEMENTED_SKILLS } from "../../src/generators/index";
import type { Tier } from "../../src/engine/types";

/**
 * The briefing shows `worked[0].text` as its free hint, in a 268 px wide column
 * inside the loadout panel. That panel is a fixed height, so a first step that
 * grows past what it can wrap into would render outside the panel rather than
 * be clipped.
 *
 * The longest today is g.10.4's at 146 characters, which wraps to five lines and
 * fits with room to spare. This pins the budget: if a future step goes past it,
 * either shorten the step or raise PANEL_H in BriefingScene and move this
 * number with it.
 */
const HINT_BUDGET = 165;

describe("the briefing's free hint fits its panel", () => {
  it("keeps every first worked step inside the budget", () => {
    let worst = { len: 0, skill: "", tier: 1 as Tier, seed: 0 };

    for (const skill of IMPLEMENTED_SKILLS) {
      const gen = generatorFor(skill);
      for (const tier of [1, 2, 3, 4] as Tier[]) {
        for (let seed = 0; seed < 20; seed++) {
          const text = gen(tier, seed).worked[0]?.text ?? "";
          if (text.length > worst.len) worst = { len: text.length, skill, tier, seed };
        }
      }
    }

    expect(
      worst.len,
      `${worst.skill} tier ${worst.tier} seed ${worst.seed} writes a ${worst.len} character first step`,
    ).toBeLessThanOrEqual(HINT_BUDGET);
  });
});
