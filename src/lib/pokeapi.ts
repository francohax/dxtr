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

interface RawEffectEntry {
  short_effect: string;
  language: { name: string };
}

interface RawMoveDetail {
  id: number;
  name: string;
  type: { name: string };
  damage_class: { name: string };
  power: number | null;
  accuracy: number | null;
  pp: number;
  effect_chance: number | null;
  effect_entries: RawEffectEntry[];
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
      hp: stats.hp ?? 0,
      attack: stats.attack ?? 0,
      defense: stats.defense ?? 0,
      spAttack: stats["special-attack"] ?? 0,
      spDefense: stats["special-defense"] ?? 0,
      speed: stats.speed ?? 0,
    },
    moveNames: raw.moves.map(m => m.move.name),
  };
}

export async function fetchMove(nameOrId: string | number): Promise<MoveDetail> {
  const raw = await fetchJson<RawMoveDetail>(`${BASE}/move/${nameOrId}`);
  const enEntry = raw.effect_entries.find(e => e.language.name === "en");
  const shortEffect = enEntry?.short_effect
    .replace(/\$effect_chance/g, String(raw.effect_chance ?? 0)) ?? null;
  return {
    pokeApiId: raw.id,
    name: raw.name,
    type: raw.type.name as PokemonType,
    category: raw.damage_class.name as MoveCategory,
    power: raw.power,
    accuracy: raw.accuracy,
    pp: raw.pp,
    effect: shortEffect,
    effectChance: raw.effect_chance,
  };
}

export async function fetchAllPokemonNames(): Promise<string[]> {
  const res = await fetch(
    "https://pokeapi.co/api/v2/pokemon?limit=1302&offset=0",
    { next: { revalidate: 604800 } }
  );
  if (!res.ok) throw new Error(`PokeAPI ${res.status}: pokemon list`);
  const data = (await res.json()) as { results: { name: string }[] };
  return data.results.map(p => p.name);
}

export async function fetchAllMoveNames(): Promise<string[]> {
  const res = await fetch(
    "https://pokeapi.co/api/v2/move?limit=937&offset=0",
    { next: { revalidate: 604800 } }
  );
  if (!res.ok) throw new Error(`PokeAPI ${res.status}: move list`);
  const data = (await res.json()) as { results: { name: string }[] };
  return data.results.map(m => m.name);
}
