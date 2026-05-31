import { describe, it, expect } from "vitest";
import {
  getItemDefenseMult,
  getItemDamageMult,
  COMPETITIVE_ITEMS,
} from "~/lib/items";

const occa       = COMPETITIVE_ITEMS.find(i => i.slug === "occa-berry")!;
const passho     = COMPETITIVE_ITEMS.find(i => i.slug === "passho-berry")!;
const silkScarf  = COMPETITIVE_ITEMS.find(i => i.slug === "silk-scarf")!;
const lifeOrb    = COMPETITIVE_ITEMS.find(i => i.slug === "life-orb")!;
const assaultVest= COMPETITIVE_ITEMS.find(i => i.slug === "assault-vest")!;
const choiceBand = COMPETITIVE_ITEMS.find(i => i.slug === "choice-band")!;

describe("getItemDefenseMult — type_resist_berry", () => {
  it("halves damage when move type matches berry type", () => {
    expect(getItemDefenseMult(occa, "special", "fire")).toBe(0.5);
  });

  it("does not activate when move type does not match", () => {
    expect(getItemDefenseMult(occa, "special", "water")).toBe(1);
  });

  it("passho berry halves water damage", () => {
    expect(getItemDefenseMult(passho, "physical", "water")).toBe(0.5);
  });

  it("type_resist_berry activates for physical moves too", () => {
    expect(getItemDefenseMult(occa, "physical", "fire")).toBe(0.5);
  });

  it("assault vest still applies SpDef boost for special moves", () => {
    expect(getItemDefenseMult(assaultVest, "special", "fire")).toBe(1.5);
  });

  it("assault vest does not apply to physical moves", () => {
    expect(getItemDefenseMult(assaultVest, "physical", "fire")).toBe(1);
  });

  it("returns 1 when item has no relevant effect", () => {
    expect(getItemDefenseMult(choiceBand, "physical", "fire")).toBe(1);
  });
});

describe("getItemDamageMult — silk scarf (normal type_boost)", () => {
  it("boosts normal-type move damage by 1.2", () => {
    expect(getItemDamageMult(silkScarf, "normal", 1)).toBe(1.2);
  });

  it("does not boost non-normal moves", () => {
    expect(getItemDamageMult(silkScarf, "fire", 1)).toBe(1);
  });
});

describe("getItemDamageMult — life orb", () => {
  it("boosts damage by 1.3 regardless of type", () => {
    expect(getItemDamageMult(lifeOrb, "ghost", 1)).toBe(1.3);
  });
});

describe("COMPETITIVE_ITEMS — Champions items present", () => {
  const championsItems = COMPETITIVE_ITEMS.filter(i => i.isChampionsItem);

  it("has at least 80 Champions items", () => {
    expect(championsItems.length).toBeGreaterThanOrEqual(80);
  });

  it("Occa Berry is a Champions item", () => {
    expect(occa.isChampionsItem).toBe(true);
  });

  it("Choice Band is NOT a Champions item", () => {
    expect(choiceBand.isChampionsItem).toBeFalsy();
  });

  it("all 18 type-resist berries are present", () => {
    const resistTypes = ["fire","water","electric","grass","ice","fighting","poison","ground","flying","psychic","bug","rock","ghost","dragon","dark","steel","normal","fairy"];
    for (const t of resistTypes) {
      const berry = COMPETITIVE_ITEMS.find(i => i.effect.type === "type_resist_berry" && i.effect.poketype === t);
      expect(berry, `Missing type_resist_berry for ${t}`).toBeDefined();
    }
  });

  it("all 59 mega stones are present", () => {
    const megaStones = COMPETITIVE_ITEMS.filter(i => i.slug.endsWith("ite") || i.slug.endsWith("ite-x") || i.slug.endsWith("ite-y"));
    expect(megaStones.length).toBeGreaterThanOrEqual(59);
  });
});
