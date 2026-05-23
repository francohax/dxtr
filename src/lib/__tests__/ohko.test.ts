import { describe, it, expect } from "vitest";
import { calcOhkoOdds, defenderHpAtL50 } from "~/lib/ohko";

describe("defenderHpAtL50", () => {
  // HP formula (0 IVs, 0 EVs, level 50):
  //   floor((2 × base + 0) × 50 / 100) + 50 + 10 = base + 60
  it("returns base+60 for level 50 with 0 IVs/EVs", () => {
    expect(defenderHpAtL50(45)).toBe(105);   // Pikachu
    expect(defenderHpAtL50(160)).toBe(220);  // Snorlax
    expect(defenderHpAtL50(1)).toBe(61);     // Shedinja (1 HP base)
  });
});

describe("calcOhkoOdds", () => {
  // 16 random rolls: 85/100 through 100/100
  // OHKO when floor(modifiedBeforeRandom × roll / 100) >= defenderHp

  it("returns 1 (always OHKO) when min damage >= defenderHp", () => {
    // modifiedBeforeRandom=200, defenderHp=100
    // min = floor(200 × 0.85) = 170 >= 100 → all 16 rolls OHKO
    expect(calcOhkoOdds(200, 100)).toBe(1);
  });

  it("returns 0 (never OHKO) when max damage < defenderHp", () => {
    // modifiedBeforeRandom=100, defenderHp=200
    // max = floor(100 × 1.0) = 100 < 200 → no rolls OHKO
    expect(calcOhkoOdds(100, 200)).toBe(0);
  });

  it("returns partial odds when HP is in the damage range", () => {
    // modifiedBeforeRandom=100, defenderHp=97
    // Rolls that OHKO: those where floor(100 × roll/100) >= 97
    //   roll=97: floor(97) = 97 ✓
    //   roll=98: floor(98) = 98 ✓
    //   roll=99: floor(99) = 99 ✓
    //   roll=100: floor(100) = 100 ✓
    // That's 4 rolls out of 16 → 4/16 = 0.25
    expect(calcOhkoOdds(100, 97)).toBeCloseTo(4 / 16);
  });

  it("returns 1/16 for exactly the max roll reaching HP", () => {
    // Only the roll=100 (1.0) achieves exactly defenderHp
    // modifiedBeforeRandom=100, defenderHp=100
    // floor(100 × 100/100) = 100 >= 100 → only roll 100 OHKOs → 1/16
    expect(calcOhkoOdds(100, 100)).toBeCloseTo(1 / 16);
  });
});
