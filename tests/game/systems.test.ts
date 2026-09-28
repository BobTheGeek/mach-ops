import { describe, it, expect } from "vitest";
import { SYSTEMS, systemFor, systemStatus } from "../../src/game/systems";
import curriculum from "../../src/data/curriculum.json";
import type { SystemsStatus } from "../../src/engine/types";

const skills = (curriculum as unknown as { skills: { id: string }[] }).skills.map((s) => s.id);

describe("systemFor", () => {
  it("routes every skill in the registry to exactly one system", () => {
    for (const id of skills) expect(systemFor(id), id).not.toBeNull();
  });

  it("puts number sense on the radar and expressions on the engines", () => {
    expect(systemFor("ns.1.4")).toBe("RADAR");
    expect(systemFor("ee.3.2")).toBe("ENGINES");
  });

  it("prefers the longer prefix, so honors skills land with their own cluster", () => {
    expect(systemFor("h8.ee.a1")).toBe("ENGINES");
    expect(systemFor("h8.g.b3")).toBe("WEAPONS");
  });

  it("returns null for something that is not a skill id", () => {
    expect(systemFor("nonsense")).toBeNull();
  });

  it("spreads the registry across all four systems", () => {
    const used = new Set(skills.map((id) => systemFor(id)));
    for (const s of SYSTEMS) expect(used, s).toContain(s);
  });
});

describe("systemStatus", () => {
  const ch1 = ["ns.1.1", "ns.1.2", "ns.1.3"];
  const of = (map: Record<string, SystemsStatus>) => (s: string): SystemsStatus => map[s] ?? "OFFLINE";

  it("is OFFLINE when nothing in the system has been seen", () => {
    expect(systemStatus(ch1, of({}), "RADAR")).toBe("OFFLINE");
  });

  it("reads at the weakest skill that has been seen", () => {
    expect(systemStatus(ch1, of({ "ns.1.1": "ONLINE", "ns.1.2": "CALIBRATING" }), "RADAR")).toBe("CALIBRATING");
  });

  it("does not let unseen skills drag it down", () => {
    // ns.1.3 is still OFFLINE, but the two that have been flown are ONLINE.
    expect(systemStatus(ch1, of({ "ns.1.1": "ONLINE", "ns.1.2": "ONLINE" }), "RADAR")).toBe("ONLINE");
  });

  it("reaches OPTIMIZED only when every seen skill is OPTIMIZED", () => {
    const all = { "ns.1.1": "OPTIMIZED", "ns.1.2": "OPTIMIZED", "ns.1.3": "OPTIMIZED" } as Record<string, SystemsStatus>;
    expect(systemStatus(ch1, of(all), "RADAR")).toBe("OPTIMIZED");
    expect(systemStatus(ch1, of({ ...all, "ns.1.3": "ONLINE" }), "RADAR")).toBe("ONLINE");
  });

  it("ignores skills that belong to another system", () => {
    expect(systemStatus([...ch1, "h8.ee.a1"], of({ "h8.ee.a1": "CALIBRATING" }), "RADAR")).toBe("OFFLINE");
    expect(systemStatus([...ch1, "h8.ee.a1"], of({ "h8.ee.a1": "CALIBRATING" }), "ENGINES")).toBe("CALIBRATING");
  });
});
