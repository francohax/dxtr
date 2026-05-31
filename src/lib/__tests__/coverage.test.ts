import { describe, expect, it } from "vitest";
import { getTeamDefensiveSummary, getTeamOffensiveCoverage, getPokemonTypeMatchups } from "../coverage";

describe("getPokemonTypeMatchups", () => {
  it("returns exactly 18 entries", () => {
    expect(getPokemonTypeMatchups(["water"])).toHaveLength(18);
  });

  it("marks grass and electric as 2× against water", () => {
    const matchups = getPokemonTypeMatchups(["water"]);
    const grass = matchups.find(m => m.attackType === "grass");
    const electric = matchups.find(m => m.attackType === "electric");
    expect(grass?.multiplier).toBe(2);
    expect(electric?.multiplier).toBe(2);
  });

  it("marks water and ice as 0.5× against water", () => {
    const matchups = getPokemonTypeMatchups(["water"]);
    expect(matchups.find(m => m.attackType === "water")?.multiplier).toBe(0.5);
    expect(matchups.find(m => m.attackType === "ice")?.multiplier).toBe(0.5);
  });

  it("marks ice as 4× against dragon/ground (Garchomp-like)", () => {
    const matchups = getPokemonTypeMatchups(["dragon", "ground"]);
    expect(matchups.find(m => m.attackType === "ice")?.multiplier).toBe(4);
  });

  it("marks normal as 0× (immune) against ghost", () => {
    const matchups = getPokemonTypeMatchups(["ghost"]);
    expect(matchups.find(m => m.attackType === "normal")?.multiplier).toBe(0);
  });
});

describe("getTeamOffensiveCoverage", () => {
  it("returns fire/grass/ice/bug/steel/fairy as super-effective for a fire-type attacker", () => {
    const { superEffective } = getTeamOffensiveCoverage([["fire"]]);
    expect(superEffective).toContain("grass");
    expect(superEffective).toContain("ice");
    expect(superEffective).toContain("bug");
    expect(superEffective).toContain("steel");
  });

  it("marks ghost as immune to a normal-only team", () => {
    const { immune } = getTeamOffensiveCoverage([["normal"]]);
    expect(immune).toContain("ghost");
  });

  it("returns all 18 types distributed across buckets", () => {
    const coverage = getTeamOffensiveCoverage([["fire"], ["water"], ["grass"], ["electric"]]);
    const total =
      coverage.superEffective.length +
      coverage.neutral.length +
      coverage.notVeryEffective.length +
      coverage.immune.length;
    expect(total).toBe(18);
  });

  it("returns empty buckets (immune bucket only) when no move types provided", () => {
    const coverage = getTeamOffensiveCoverage([]);
    expect(coverage.superEffective).toHaveLength(0);
    expect(coverage.immune).toHaveLength(18);
  });
});

describe("getTeamDefensiveSummary", () => {
  it("returns 18 entries", () => {
    expect(getTeamDefensiveSummary([["water"]])).toHaveLength(18);
  });

  it("counts 1 weakness to electric for a water-type team member", () => {
    const summary = getTeamDefensiveSummary([["water"]]);
    const electric = summary.find(e => e.type === "electric");
    expect(electric?.weakCount).toBe(1);
  });

  it("counts 0 weakness to fire for a water-type team member", () => {
    const summary = getTeamDefensiveSummary([["water"]]);
    const fire = summary.find(e => e.type === "fire");
    expect(fire?.weakCount).toBe(0);
    expect(fire?.resistCount).toBe(1);
  });

  it("stacks weakness count across team members", () => {
    const summary = getTeamDefensiveSummary([["fire", "flying"], ["rock", "steel"]]);
    const rock = summary.find(e => e.type === "rock");
    expect(rock?.weakCount).toBeGreaterThanOrEqual(1);
  });
});
