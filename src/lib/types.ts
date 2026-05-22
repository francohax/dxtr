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

export interface TeamSlotConfig {
  position: number;       // 0–5
  pokemon: PokemonSummary;
  moves: MoveDetail[];    // max 4
}

export interface TeamConfig {
  id?: number;
  name: string;
  slots: TeamSlotConfig[];
}
