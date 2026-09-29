import { describe, it, expect } from "vitest";
import { SHOP, PRICE, shopItem, itemsOfKind, liveryItemId } from "../../src/data/shop";
import { FLEET } from "../../src/data/fleet";

describe("the shop catalogue", () => {
  it("gives every item a unique id", () => {
    const ids = SHOP.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("sells nothing for free and nothing at a negative price", () => {
    for (const i of SHOP) expect(i.cost, i.id).toBeGreaterThan(0);
  });

  it("describes every item, so nothing is bought blind", () => {
    for (const i of SHOP) {
      expect(i.name.length, i.id).toBeGreaterThan(0);
      expect(i.blurb.length, i.id).toBeGreaterThan(20);
    }
  });

  // The whole point of the catalogue: it must not contain anything that could
  // make the maths easier. If a kind ever appears that is not cosmetic, this
  // fails and someone has to argue for it.
  it("sells looks only", () => {
    for (const i of SHOP) expect(["livery", "hud", "reticle"], i.id).toContain(i.kind);
  });

  it("offers exactly the liveries the fleet has sprites for", () => {
    const expected = FLEET.flatMap((f) => f.liveries.map((l) => liveryItemId(f.airframe, l.id)));
    expect(itemsOfKind("livery").map((i) => i.id)).toEqual(expected);
  });

  it("gives every livery an airframe and a sprite suffix to resolve", () => {
    for (const i of itemsOfKind("livery")) {
      expect(i.airframe, i.id).toBeTruthy();
      expect(i.livery, i.id).toBeTruthy();
    }
  });

  it("gives every hud and reticle a value to apply", () => {
    for (const i of [...itemsOfKind("hud"), ...itemsOfKind("reticle")]) {
      expect(i.value, i.id).toBeTruthy();
    }
  });

  it("prices each kind consistently", () => {
    for (const i of SHOP) expect(i.cost, i.id).toBe(PRICE[i.kind]);
  });

  it("finds an item by id and returns null for one that is not sold", () => {
    expect(shopItem(SHOP[0]!.id)).not.toBeNull();
    expect(shopItem("livery.mig29.red")).toBeNull();
  });
});
