import { getTypeEffectiveness } from "~/lib/damage";
import { ALL_POKEMON_TYPES, type PokemonType } from "~/lib/types";

export type TypeMatchupEntry = {
  attackType: PokemonType;
  multiplier: number;
};

export type OffensiveCoverage = {
  superEffective: PokemonType[];
  neutral: PokemonType[];
  notVeryEffective: PokemonType[];
  immune: PokemonType[];
};

export type DefensiveSummary = {
  type: PokemonType;
  weakCount: number;
  resistCount: number;
  immuneCount: number;
}[];

export function getPokemonTypeMatchups(defenderTypes: PokemonType[]): TypeMatchupEntry[] {
  return ALL_POKEMON_TYPES.map(attackType => ({
    attackType,
    multiplier: getTypeEffectiveness(attackType, defenderTypes),
  }));
}

export function getTeamOffensiveCoverage(teamMoveTypes: PokemonType[][]): OffensiveCoverage {
  const uniqueMoveTypes = [...new Set(teamMoveTypes.flat())];

  const result: OffensiveCoverage = {
    superEffective: [],
    neutral: [],
    notVeryEffective: [],
    immune: [],
  };

  for (const defType of ALL_POKEMON_TYPES) {
    if (uniqueMoveTypes.length === 0) {
      result.immune.push(defType);
      continue;
    }
    const bestMult = Math.max(
      ...uniqueMoveTypes.map(mt => getTypeEffectiveness(mt, [defType]))
    );
    if (bestMult >= 2) result.superEffective.push(defType);
    else if (bestMult === 1) result.neutral.push(defType);
    else if (bestMult > 0) result.notVeryEffective.push(defType);
    else result.immune.push(defType);
  }

  return result;
}

export function getTeamDefensiveSummary(teamDefenderTypes: PokemonType[][]): DefensiveSummary {
  return ALL_POKEMON_TYPES.map(attackType => {
    let weakCount = 0;
    let resistCount = 0;
    let immuneCount = 0;

    for (const defenderTypes of teamDefenderTypes) {
      const mult = getTypeEffectiveness(attackType, defenderTypes);
      if (mult >= 2) weakCount++;
      else if (mult === 0) immuneCount++;
      else if (mult < 1) resistCount++;
    }

    return { type: attackType, weakCount, resistCount, immuneCount };
  });
}
