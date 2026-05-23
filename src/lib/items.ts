import { type PokemonType } from "~/lib/types";

export type ItemEffect =
  | { type: "attack_mult";  mult: number; category: "physical" | "special" | "any" }
  | { type: "defense_mult"; mult: number }
  | { type: "damage_mult";  mult: number; superEffectiveOnly?: boolean }
  | { type: "type_boost";   poketype: PokemonType; mult: number }
  | { type: "none" };

export interface CompetitiveItem {
  slug: string;
  name: string;
  spriteUrl: string;
  effect: ItemEffect;
}

const SPRITE = (slug: string) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;

export const COMPETITIVE_ITEMS: CompetitiveItem[] = [
  // ── Attack stat multipliers ──────────────────────────────────────────────────
  { slug: "choice-band",    name: "Choice Band",    spriteUrl: SPRITE("choice-band"),    effect: { type: "attack_mult", mult: 1.5, category: "physical" } },
  { slug: "choice-specs",   name: "Choice Specs",   spriteUrl: SPRITE("choice-specs"),   effect: { type: "attack_mult", mult: 1.5, category: "special" } },
  // ── Final damage multipliers ─────────────────────────────────────────────────
  { slug: "life-orb",       name: "Life Orb",       spriteUrl: SPRITE("life-orb"),       effect: { type: "damage_mult", mult: 1.3 } },
  { slug: "expert-belt",    name: "Expert Belt",    spriteUrl: SPRITE("expert-belt"),    effect: { type: "damage_mult", mult: 1.2, superEffectiveOnly: true } },
  // ── Defender: special defense multiplier ─────────────────────────────────────
  { slug: "assault-vest",   name: "Assault Vest",   spriteUrl: SPRITE("assault-vest"),   effect: { type: "defense_mult", mult: 1.5 } },
  // ── Type-boosting held items ─────────────────────────────────────────────────
  { slug: "charcoal",       name: "Charcoal",       spriteUrl: SPRITE("charcoal"),       effect: { type: "type_boost", poketype: "fire",     mult: 1.2 } },
  { slug: "mystic-water",   name: "Mystic Water",   spriteUrl: SPRITE("mystic-water"),   effect: { type: "type_boost", poketype: "water",    mult: 1.2 } },
  { slug: "miracle-seed",   name: "Miracle Seed",   spriteUrl: SPRITE("miracle-seed"),   effect: { type: "type_boost", poketype: "grass",    mult: 1.2 } },
  { slug: "magnet",         name: "Magnet",         spriteUrl: SPRITE("magnet"),         effect: { type: "type_boost", poketype: "electric", mult: 1.2 } },
  { slug: "nevermeltice",   name: "NeverMeltIce",   spriteUrl: SPRITE("nevermeltice"),   effect: { type: "type_boost", poketype: "ice",      mult: 1.2 } },
  { slug: "black-belt",     name: "Black Belt",     spriteUrl: SPRITE("black-belt"),     effect: { type: "type_boost", poketype: "fighting", mult: 1.2 } },
  { slug: "poison-barb",    name: "Poison Barb",    spriteUrl: SPRITE("poison-barb"),    effect: { type: "type_boost", poketype: "poison",   mult: 1.2 } },
  { slug: "soft-sand",      name: "Soft Sand",      spriteUrl: SPRITE("soft-sand"),      effect: { type: "type_boost", poketype: "ground",   mult: 1.2 } },
  { slug: "sharp-beak",     name: "Sharp Beak",     spriteUrl: SPRITE("sharp-beak"),     effect: { type: "type_boost", poketype: "flying",   mult: 1.2 } },
  { slug: "twisted-spoon",  name: "Twisted Spoon",  spriteUrl: SPRITE("twisted-spoon"),  effect: { type: "type_boost", poketype: "psychic",  mult: 1.2 } },
  { slug: "silverpowder",   name: "SilverPowder",   spriteUrl: SPRITE("silverpowder"),   effect: { type: "type_boost", poketype: "bug",      mult: 1.2 } },
  { slug: "hard-stone",     name: "Hard Stone",     spriteUrl: SPRITE("hard-stone"),     effect: { type: "type_boost", poketype: "rock",     mult: 1.2 } },
  { slug: "spell-tag",      name: "Spell Tag",      spriteUrl: SPRITE("spell-tag"),      effect: { type: "type_boost", poketype: "ghost",    mult: 1.2 } },
  { slug: "dragon-fang",    name: "Dragon Fang",    spriteUrl: SPRITE("dragon-fang"),    effect: { type: "type_boost", poketype: "dragon",   mult: 1.2 } },
  { slug: "black-glasses",  name: "BlackGlasses",   spriteUrl: SPRITE("black-glasses"),  effect: { type: "type_boost", poketype: "dark",     mult: 1.2 } },
  { slug: "metal-coat",     name: "Metal Coat",     spriteUrl: SPRITE("metal-coat"),     effect: { type: "type_boost", poketype: "steel",    mult: 1.2 } },
  { slug: "fairy-feather",  name: "Fairy Feather",  spriteUrl: SPRITE("fairy-feather"),  effect: { type: "type_boost", poketype: "fairy",    mult: 1.2 } },
];

export function getItemAttackMult(item: CompetitiveItem, moveCategory: string): number {
  const { effect } = item;
  if (effect.type !== "attack_mult") return 1;
  if (effect.category === "any") return effect.mult;
  if (effect.category === "physical" && moveCategory === "physical") return effect.mult;
  if (effect.category === "special"  && moveCategory === "special")  return effect.mult;
  return 1;
}

export function getItemDefenseMult(item: CompetitiveItem, moveCategory: string): number {
  const { effect } = item;
  if (effect.type === "defense_mult" && moveCategory === "special") return effect.mult;
  return 1;
}

export function getItemDamageMult(
  item: CompetitiveItem,
  moveType: PokemonType,
  typeEffectiveness: number,
): number {
  const { effect } = item;
  if (effect.type === "damage_mult") {
    if (effect.superEffectiveOnly && typeEffectiveness <= 1) return 1;
    return effect.mult;
  }
  if (effect.type === "type_boost" && effect.poketype === moveType) return effect.mult;
  return 1;
}
