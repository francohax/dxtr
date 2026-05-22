import { describe, it, expect } from "vitest";
import { calculateDamage, getTypeEffectiveness } from "~/lib/damage";

describe("calculateDamage", () => {
  it("returns correct average for a neutral hit", () => {
    const result = calculateDamage({
      level: 50,
      power: 80,
      attackStat: 100,
      defenseStat: 100,
      stab: false,
      typeEffectiveness: 1,
    });
    expect(result.average).toBe(34); // ((22*80)/50+2)*0.925 = 34.41 → 34
    expect(result.min).toBeLessThan(result.max);
    expect(result.stab).toBe(1.0);
  });

  it("applies STAB multiplier of 1.5", () => {
    const noStab = calculateDamage({ level: 50, power: 80, attackStat: 100, defenseStat: 100, stab: false, typeEffectiveness: 1 });
    const withStab = calculateDamage({ level: 50, power: 80, attackStat: 100, defenseStat: 100, stab: true, typeEffectiveness: 1 });
    expect(withStab.average).toBeCloseTo(noStab.average * 1.5, 0);
    expect(withStab.stab).toBe(1.5);
  });

  it("applies super-effective multiplier of 2", () => {
    const neutral = calculateDamage({ level: 50, power: 80, attackStat: 100, defenseStat: 100, stab: false, typeEffectiveness: 1 });
    const superEffective = calculateDamage({ level: 50, power: 80, attackStat: 100, defenseStat: 100, stab: false, typeEffectiveness: 2 });
    expect(superEffective.average).toBeCloseTo(neutral.average * 2, 0);
  });

  it("returns base damage for a zero-power move", () => {
    const result = calculateDamage({ level: 50, power: 0, attackStat: 100, defenseStat: 100, stab: false, typeEffectiveness: 1 });
    expect(result.min).toBe(1); // floor(2*0.85) = 1
    expect(result.max).toBe(2); // floor(2*1.0) = 2
  });
});

describe("getTypeEffectiveness", () => {
  it("fire is super-effective vs grass", () => {
    expect(getTypeEffectiveness("fire", ["grass"])).toBe(2);
  });

  it("fire is not very effective vs water", () => {
    expect(getTypeEffectiveness("fire", ["water"])).toBe(0.5);
  });

  it("electric is immune vs ground", () => {
    expect(getTypeEffectiveness("electric", ["ground"])).toBe(0);
  });

  it("neutral returns 1", () => {
    expect(getTypeEffectiveness("normal", ["normal"])).toBe(1);
  });
});
