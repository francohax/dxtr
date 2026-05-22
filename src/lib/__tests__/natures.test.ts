import { describe, it, expect } from "vitest";
import { getNatureMultiplier, calcStat } from "~/lib/natures";

describe("getNatureMultiplier", () => {
  it("returns 1.1 for the boosted stat", () => {
    expect(getNatureMultiplier("adamant", "attack")).toBe(1.1);
  });
  it("returns 0.9 for the reduced stat", () => {
    expect(getNatureMultiplier("adamant", "spAttack")).toBe(0.9);
  });
  it("returns 1.0 for an unaffected stat", () => {
    expect(getNatureMultiplier("adamant", "defense")).toBe(1.0);
  });
  it("returns 1.0 for a neutral nature", () => {
    expect(getNatureMultiplier("hardy", "attack")).toBe(1.0);
  });
});

describe("calcStat", () => {
  // Pikachu HP: base=35, iv=31, ev=0, level=50, hardy
  // HP = floor((2*35+31+0)*50/100) + 50 + 10 = floor(50.5) + 60 = 110
  it("calculates HP correctly", () => {
    expect(calcStat({ base: 35, iv: 31, ev: 0, level: 50, nature: "hardy", stat: "hp" })).toBe(110);
  });

  // Garchomp Atk: base=130, iv=31, ev=252, level=50, jolly (+spd -spAtk, neutral on atk)
  // base2 = 260+31+63=354; raw = floor(354*0.5)+5 = 177+5 = 182; ×1.0 = 182
  it("calculates non-HP stat correctly (neutral nature)", () => {
    expect(calcStat({ base: 130, iv: 31, ev: 252, level: 50, nature: "jolly", stat: "attack" })).toBe(182);
  });

  // Adamant: +atk; floor(182*1.1) = floor(200.2) = 200
  it("applies nature boost", () => {
    expect(calcStat({ base: 130, iv: 31, ev: 252, level: 50, nature: "adamant", stat: "attack" })).toBe(200);
  });

  // IV=0 EV=0: base2=260; raw=130+5=135; ×1.0=135
  it("handles zero IV and zero EV", () => {
    expect(calcStat({ base: 130, iv: 0, ev: 0, level: 50, nature: "hardy", stat: "attack" })).toBe(135);
  });
});
