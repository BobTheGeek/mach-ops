import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { MEDAL_SPRITE_FILES } from "../../src/game/assets";

describe("vendored medal art", () => {
  it("has every sprite the loader expects", () => {
    for (const name of MEDAL_SPRITE_FILES) {
      expect(existsSync(resolve("design/svg/medals", `${name}.svg`)), name).toBe(true);
    }
  });
  it("lists exactly the 15 sprites from the handoff", () => {
    expect(MEDAL_SPRITE_FILES).toHaveLength(15);
  });
});
