/**
 * Defender's HP at level 50 with 0 IVs and 0 EVs.
 * HP = floor((2 × base) × 50 / 100) + 50 + 10 = base + 60
 */
export function defenderHpAtL50(baseHp: number): number {
  return Math.floor((2 * baseHp * 50) / 100) + 50 + 10;
}

/**
 * Probability of a one-hit KO.
 * Gen 6+: 16 uniform random rolls from 85/100 to 100/100.
 * OHKO occurs when floor(modifiedBeforeRandom × roll/100) >= defenderHp.
 */
export function calcOhkoOdds(modifiedBeforeRandom: number, defenderHp: number): number {
  let ohkoCount = 0;
  for (let roll = 85; roll <= 100; roll++) {
    if (Math.floor((modifiedBeforeRandom * roll) / 100) >= defenderHp) {
      ohkoCount++;
    }
  }
  return ohkoCount / 16;
}
