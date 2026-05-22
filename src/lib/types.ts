export type PokemonType =
  | "normal" | "fire" | "water" | "electric" | "grass" | "ice"
  | "fighting" | "poison" | "ground" | "flying" | "psychic" | "bug"
  | "rock" | "ghost" | "dragon" | "dark" | "steel" | "fairy";

export type MoveCategory = "physical" | "special" | "status";

export interface PokemonSummary {
  pokeApiId: number;
  name: string;
  sprite: string;
  types: PokemonType[];
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    spAttack: number;
    spDefense: number;
    speed: number;
  };
  moveNames: string[];
}

export interface MoveDetail {
  pokeApiId: number;
  name: string;
  type: PokemonType;
  category: MoveCategory;
  power: number | null;
  accuracy: number | null;
  pp: number;
}

export interface StatSet {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

export const ZERO_STATS: StatSet = {
  hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0,
};

export interface TeamSlotConfig {
  position: number;       // 0–5
  pokemon: PokemonSummary;
  moves: MoveDetail[];    // max 4
  nature: string;         // "adamant", "timid", etc. Default: "hardy"
  evs: StatSet;           // each 0–252, total ≤ 510
  ivs: StatSet;           // each 0–31
  ivsEnabled: boolean;    // false = treat all IVs as 0 in calculations
}

export interface TeamConfig {
  id?: number;
  name: string;
  slots: TeamSlotConfig[];
}
