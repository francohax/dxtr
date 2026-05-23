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
  effect: string | null;
  effectChance: number | null;
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
  position: number;
  pokemon: PokemonSummary;
  moves: MoveDetail[];
  nature: string;
  evs: StatSet;
  ivs: StatSet;
  ivsEnabled: boolean;
}

export interface TeamConfig {
  id?: number;
  name: string;
  slots: TeamSlotConfig[];
}

export type Weather = "none" | "sun" | "rain" | "sandstorm" | "hail";
export type Terrain = "none" | "electric" | "grassy" | "psychic" | "misty";

export interface BattleConfig {
  level: number;
  weather: Weather;
  terrain: Terrain;
  isCritical: boolean;
  attackerBurned: boolean;
}

export const DEFAULT_BATTLE_CONFIG: BattleConfig = {
  level: 50,
  weather: "none",
  terrain: "none",
  isCritical: false,
  attackerBurned: false,
};
