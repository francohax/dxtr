import "server-only";
import { type PokemonSummary, type MoveDetail, type PokemonType, type MoveCategory } from "~/lib/types";

const BASE = "https://pokeapi.co/api/v2";

interface RawStat { base_stat: number; stat: { name: string } }
interface RawType { type: { name: string } }
interface RawMove { move: { name: string } }
interface RawSprites { front_default: string | null; other?: { "official-artwork"?: { front_default: string | null } } }

interface RawPokemon {
  id: number;
  name: string;
  sprites: RawSprites;
  types: RawType[];
  stats: RawStat[];
  moves: RawMove[];
}

interface RawMoveDetail {
  id: number;
  name: string;
  type: { name: string };
  damage_class: { name: string };
  power: number | null;
  accuracy: number | null;
  pp: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`PokeAPI ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

export async function fetchPokemon(nameOrId: string | number): Promise<PokemonSummary> {
  const raw = await fetchJson<RawPokemon>(`${BASE}/pokemon/${nameOrId}`);
  const stats = Object.fromEntries(raw.stats.map(s => [s.stat.name, s.base_stat]));
  return {
    pokeApiId: raw.id,
    name: raw.name,
    sprite:
      raw.sprites.other?.["official-artwork"]?.front_default ??
      raw.sprites.front_default ??
      "",
    types: raw.types.map(t => t.type.name as PokemonType),
    baseStats: {
      hp: stats["hp"] ?? 0,
      attack: stats["attack"] ?? 0,
      defense: stats["defense"] ?? 0,
      spAttack: stats["special-attack"] ?? 0,
      spDefense: stats["special-defense"] ?? 0,
      speed: stats["speed"] ?? 0,
    },
    moveNames: raw.moves.map(m => m.move.name),
  };
}

export async function fetchMove(nameOrId: string | number): Promise<MoveDetail> {
  const raw = await fetchJson<RawMoveDetail>(`${BASE}/move/${nameOrId}`);
  return {
    pokeApiId: raw.id,
    name: raw.name,
    type: raw.type.name as PokemonType,
    category: raw.damage_class.name as MoveCategory,
    power: raw.power,
    accuracy: raw.accuracy,
    pp: raw.pp,
  };
}
