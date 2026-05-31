import { type PokemonType, type Weather, type Terrain } from "~/lib/types";

export interface DamageInput {
  level: number;
  power: number;
  attackStat: number;
  defenseStat: number;
  stab: boolean;
  typeEffectiveness: number;
  moveType?: PokemonType;
  weather?: Weather;
  terrain?: Terrain;
  isCritical?: boolean;
  attackerDamageMult?: number;
}

export interface DamageResult {
  min: number;
  max: number;
  average: number;
  stab: number;
  typeEffectiveness: number;
  baseDamage: number;
  modifiedBeforeRandom: number;
  weatherMult: number;
  terrainMult: number;
  critMult: number;
  itemMult?: number;
  stageMult?: number;
}

function getWeatherMult(weather: Weather | undefined, moveType: PokemonType | undefined): number {
  if (!weather || weather === "none" || !moveType) return 1;
  if (weather === "sun")  { if (moveType === "fire")  return 1.5; if (moveType === "water") return 0.5; }
  if (weather === "rain") { if (moveType === "water") return 1.5; if (moveType === "fire")  return 0.5; }
  return 1;
}

function getTerrainMult(terrain: Terrain | undefined, moveType: PokemonType | undefined): number {
  if (!terrain || terrain === "none" || !moveType) return 1;
  if (terrain === "electric" && moveType === "electric") return 1.3;
  if (terrain === "grassy"   && moveType === "grass")    return 1.3;
  if (terrain === "psychic"  && moveType === "psychic")  return 1.3;
  if (terrain === "misty"    && moveType === "dragon")   return 0.5;
  return 1;
}

export function calcEffectiveStat(base: number, ev: number, level: number, natureMult = 1, ivs = 31): number {
  return Math.floor((Math.floor((2 * base + ivs + Math.floor(ev / 4)) * level / 100) + 5) * natureMult);
}

export function getStatStageMult(stage: number): number {
  const s = Math.max(-6, Math.min(6, stage));
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}

export function calculateDamage(input: DamageInput): DamageResult {
  const { level, power, attackStat, defenseStat, stab, typeEffectiveness, moveType, weather, terrain, isCritical, attackerDamageMult } = input;
  const stabMult    = stab ? 1.5 : 1.0;
  const weatherMult = getWeatherMult(weather, moveType);
  const terrainMult = getTerrainMult(terrain, moveType);
  const critMult    = isCritical ? 1.5 : 1.0;
  const itemMult    = attackerDamageMult ?? 1;

  // Game's 4096-based chain modifier (matches pokeRound half-up rounding)
  function chainMod(d: number, mod4096: number): number {
    return Math.max(1, d + Math.floor((d * (mod4096 - 4096) + 2048) / 4096));
  }

  // Base damage with two intermediate floors matching game mechanics
  const levelFactor = Math.floor(2 * level / 5 + 2);
  const base = Math.floor(Math.floor(levelFactor * power * attackStat / defenseStat) / 50) + 2;

  // Modifiers applied in game order: roll first, then chain mods
  function applyMods(roll: number): number {
    let d = Math.floor(base * roll / 100);
    if (stab)                d = chainMod(d, 6144);                              // STAB = 3/2
    if (typeEffectiveness !== 1) d = Math.floor(d * typeEffectiveness);           // type uses floor
    if (weatherMult !== 1)   d = chainMod(d, Math.round(weatherMult * 4096));    // weather
    if (terrainMult !== 1)   d = chainMod(d, Math.round(terrainMult * 4096));    // terrain
    if (isCritical)          d = chainMod(d, 6144);                              // crit = 3/2
    if (itemMult !== 1)      d = chainMod(d, Math.round(itemMult * 4096));       // item
    return d;
  }

  const rolls = Array.from({ length: 16 }, (_, i) => applyMods(85 + i));
  const min     = Math.min(...rolls);
  const max     = Math.max(...rolls);
  const average = Math.round(rolls.reduce((a, b) => a + b, 0) / rolls.length);

  return {
    min,
    max,
    average,
    stab: stabMult,
    typeEffectiveness,
    baseDamage: base,
    modifiedBeforeRandom: base * stabMult * typeEffectiveness * weatherMult * terrainMult * critMult * itemMult,
    weatherMult,
    terrainMult,
    critMult,
    itemMult: itemMult !== 1 ? itemMult : undefined,
  };
}

const CHART: Partial<Record<PokemonType, Partial<Record<PokemonType, number>>>> = {
  normal:   { rock: 0.5, steel: 0.5, ghost: 0 },
  fire:     { fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5, grass: 2, ice: 2, bug: 2, steel: 2 },
  water:    { water: 0.5, grass: 0.5, dragon: 0.5, fire: 2, ground: 2, rock: 2 },
  electric: { electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0, flying: 2, water: 2 },
  grass:    { fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5, water: 2, ground: 2, rock: 2 },
  ice:      { water: 0.5, ice: 0.5, fire: 0.5, steel: 0.5, grass: 2, ground: 2, flying: 2, dragon: 2 },
  fighting: { poison: 0.5, bug: 0.5, psychic: 0.5, flying: 0.5, fairy: 0.5, ghost: 0, normal: 2, ice: 2, rock: 2, dark: 2, steel: 2 },
  poison:   { poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, grass: 2, fairy: 2 },
  ground:   { grass: 0.5, bug: 0.5, flying: 0, electric: 2, fire: 2, poison: 2, rock: 2, steel: 2 },
  flying:   { electric: 0.5, rock: 0.5, steel: 0.5, grass: 2, fighting: 2, bug: 2 },
  psychic:  { psychic: 0.5, steel: 0.5, dark: 0, fighting: 2, poison: 2 },
  bug:      { fire: 0.5, fighting: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5, grass: 2, psychic: 2, dark: 2 },
  rock:     { fighting: 0.5, ground: 0.5, steel: 0.5, fire: 2, ice: 2, flying: 2, bug: 2 },
  ghost:    { normal: 0, dark: 0.5, psychic: 2, ghost: 2 },
  dragon:   { steel: 0.5, fairy: 0, dragon: 2 },
  dark:     { fighting: 0.5, dark: 0.5, fairy: 0.5, psychic: 2, ghost: 2 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5, ice: 2, rock: 2, fairy: 2 },
  fairy:    { fire: 0.5, poison: 0.5, steel: 0.5, fighting: 2, dragon: 2, dark: 2 },
};

export function getTypeEffectiveness(moveType: PokemonType, defenderTypes: PokemonType[]): number {
  const attackChart = CHART[moveType] ?? {};
  return defenderTypes.reduce((mult, defType) => {
    return mult * (attackChart[defType] ?? 1);
  }, 1);
}
