import { type PokemonType } from "~/lib/types";

export type ItemEffect =
  | { type: "attack_mult";       mult: number; category: "physical" | "special" | "any" }
  | { type: "defense_mult";      mult: number }
  | { type: "damage_mult";       mult: number; superEffectiveOnly?: boolean }
  | { type: "type_boost";        poketype: PokemonType; mult: number }
  | { type: "type_resist_berry"; poketype: PokemonType; mult: 0.5 }
  | { type: "none" };

export interface CompetitiveItem {
  slug: string;
  name: string;
  spriteUrl: string;
  effect: ItemEffect;
  isChampionsItem?: boolean;
}

const SPRITE = (slug: string) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;

export const COMPETITIVE_ITEMS: CompetitiveItem[] = [
  // ── Attack stat multipliers ──────────────────────────────────────────────────
  { slug: "choice-band",    name: "Choice Band",    spriteUrl: SPRITE("choice-band"),    effect: { type: "attack_mult", mult: 1.5, category: "physical" } },
  { slug: "choice-specs",   name: "Choice Specs",   spriteUrl: SPRITE("choice-specs"),   effect: { type: "attack_mult", mult: 1.5, category: "special"  } },
  // ── Final damage multipliers ─────────────────────────────────────────────────
  { slug: "life-orb",       name: "Life Orb",       spriteUrl: SPRITE("life-orb"),       effect: { type: "damage_mult", mult: 1.3 } },
  { slug: "expert-belt",    name: "Expert Belt",    spriteUrl: SPRITE("expert-belt"),    effect: { type: "damage_mult", mult: 1.2, superEffectiveOnly: true } },
  // ── Defender: special defense multiplier ─────────────────────────────────────
  { slug: "assault-vest",   name: "Assault Vest",   spriteUrl: SPRITE("assault-vest"),   effect: { type: "defense_mult", mult: 1.5 } },
  // ── Type-boosting held items (Champions) ─────────────────────────────────────
  { slug: "charcoal",         name: "Charcoal",       spriteUrl: SPRITE("charcoal"),         effect: { type: "type_boost", poketype: "fire",     mult: 1.2 }, isChampionsItem: true },
  { slug: "mystic-water",     name: "Mystic Water",   spriteUrl: SPRITE("mystic-water"),     effect: { type: "type_boost", poketype: "water",    mult: 1.2 }, isChampionsItem: true },
  { slug: "miracle-seed",     name: "Miracle Seed",   spriteUrl: SPRITE("miracle-seed"),     effect: { type: "type_boost", poketype: "grass",    mult: 1.2 }, isChampionsItem: true },
  { slug: "magnet",           name: "Magnet",         spriteUrl: SPRITE("magnet"),           effect: { type: "type_boost", poketype: "electric", mult: 1.2 }, isChampionsItem: true },
  { slug: "never-melt-ice",   name: "Never-Melt Ice", spriteUrl: SPRITE("never-melt-ice"),   effect: { type: "type_boost", poketype: "ice",      mult: 1.2 }, isChampionsItem: true },
  { slug: "black-belt",       name: "Black Belt",     spriteUrl: SPRITE("black-belt"),       effect: { type: "type_boost", poketype: "fighting", mult: 1.2 }, isChampionsItem: true },
  { slug: "poison-barb",      name: "Poison Barb",    spriteUrl: SPRITE("poison-barb"),      effect: { type: "type_boost", poketype: "poison",   mult: 1.2 }, isChampionsItem: true },
  { slug: "soft-sand",        name: "Soft Sand",      spriteUrl: SPRITE("soft-sand"),        effect: { type: "type_boost", poketype: "ground",   mult: 1.2 }, isChampionsItem: true },
  { slug: "sharp-beak",       name: "Sharp Beak",     spriteUrl: SPRITE("sharp-beak"),       effect: { type: "type_boost", poketype: "flying",   mult: 1.2 }, isChampionsItem: true },
  { slug: "twisted-spoon",    name: "Twisted Spoon",  spriteUrl: SPRITE("twisted-spoon"),    effect: { type: "type_boost", poketype: "psychic",  mult: 1.2 }, isChampionsItem: true },
  { slug: "silver-powder",    name: "Silver Powder",  spriteUrl: SPRITE("silver-powder"),    effect: { type: "type_boost", poketype: "bug",      mult: 1.2 }, isChampionsItem: true },
  { slug: "hard-stone",       name: "Hard Stone",     spriteUrl: SPRITE("hard-stone"),       effect: { type: "type_boost", poketype: "rock",     mult: 1.2 }, isChampionsItem: true },
  { slug: "spell-tag",        name: "Spell Tag",      spriteUrl: SPRITE("spell-tag"),        effect: { type: "type_boost", poketype: "ghost",    mult: 1.2 }, isChampionsItem: true },
  { slug: "dragon-fang",      name: "Dragon Fang",    spriteUrl: SPRITE("dragon-fang"),      effect: { type: "type_boost", poketype: "dragon",   mult: 1.2 }, isChampionsItem: true },
  { slug: "black-glasses",    name: "Black Glasses",  spriteUrl: SPRITE("black-glasses"),    effect: { type: "type_boost", poketype: "dark",     mult: 1.2 }, isChampionsItem: true },
  { slug: "metal-coat",       name: "Metal Coat",     spriteUrl: SPRITE("metal-coat"),       effect: { type: "type_boost", poketype: "steel",    mult: 1.2 }, isChampionsItem: true },
  // fairy-feather has no PokeAPI sprite (Champions-exclusive)
  { slug: "fairy-feather",    name: "Fairy Feather",  spriteUrl: "",                         effect: { type: "type_boost", poketype: "fairy",    mult: 1.2 }, isChampionsItem: true },

  // ── Champions Hold Items ──────────────────────────────────────────────────────
  { slug: "silk-scarf",    name: "Silk Scarf",    spriteUrl: SPRITE("silk-scarf"),    effect: { type: "type_boost",   poketype: "normal", mult: 1.2 }, isChampionsItem: true },
  { slug: "choice-scarf",  name: "Choice Scarf",  spriteUrl: SPRITE("choice-scarf"),  effect: { type: "none" },                                        isChampionsItem: true },
  { slug: "focus-band",    name: "Focus Band",    spriteUrl: SPRITE("focus-band"),    effect: { type: "none" },                                        isChampionsItem: true },
  { slug: "focus-sash",    name: "Focus Sash",    spriteUrl: SPRITE("focus-sash"),    effect: { type: "none" },                                        isChampionsItem: true },
  { slug: "kings-rock",    name: "King's Rock",   spriteUrl: SPRITE("kings-rock"),    effect: { type: "none" },                                        isChampionsItem: true },
  { slug: "leftovers",     name: "Leftovers",     spriteUrl: SPRITE("leftovers"),     effect: { type: "none" },                                        isChampionsItem: true },
  { slug: "light-ball",    name: "Light Ball",    spriteUrl: SPRITE("light-ball"),    effect: { type: "attack_mult", mult: 2.0, category: "any" },     isChampionsItem: true },
  { slug: "mental-herb",   name: "Mental Herb",   spriteUrl: SPRITE("mental-herb"),   effect: { type: "none" },                                        isChampionsItem: true },
  { slug: "quick-claw",    name: "Quick Claw",    spriteUrl: SPRITE("quick-claw"),    effect: { type: "none" },                                        isChampionsItem: true },
  { slug: "scope-lens",    name: "Scope Lens",    spriteUrl: SPRITE("scope-lens"),    effect: { type: "none" },                                        isChampionsItem: true },
  { slug: "shell-bell",    name: "Shell Bell",    spriteUrl: SPRITE("shell-bell"),    effect: { type: "none" },                                        isChampionsItem: true },
  { slug: "bright-powder", name: "Bright Powder", spriteUrl: SPRITE("bright-powder"), effect: { type: "none" },                                        isChampionsItem: true },
  { slug: "white-herb",    name: "White Herb",    spriteUrl: SPRITE("white-herb"),    effect: { type: "none" },                                        isChampionsItem: true },

  // ── Champions Berries — utility ───────────────────────────────────────────────
  { slug: "lum-berry",     name: "Lum Berry",     spriteUrl: SPRITE("lum-berry"),     effect: { type: "none" }, isChampionsItem: true },
  { slug: "sitrus-berry",  name: "Sitrus Berry",  spriteUrl: SPRITE("sitrus-berry"),  effect: { type: "none" }, isChampionsItem: true },
  { slug: "oran-berry",    name: "Oran Berry",    spriteUrl: SPRITE("oran-berry"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "cheri-berry",   name: "Cheri Berry",   spriteUrl: SPRITE("cheri-berry"),   effect: { type: "none" }, isChampionsItem: true },
  { slug: "chesto-berry",  name: "Chesto Berry",  spriteUrl: SPRITE("chesto-berry"),  effect: { type: "none" }, isChampionsItem: true },
  { slug: "pecha-berry",   name: "Pecha Berry",   spriteUrl: SPRITE("pecha-berry"),   effect: { type: "none" }, isChampionsItem: true },
  { slug: "rawst-berry",   name: "Rawst Berry",   spriteUrl: SPRITE("rawst-berry"),   effect: { type: "none" }, isChampionsItem: true },
  { slug: "aspear-berry",  name: "Aspear Berry",  spriteUrl: SPRITE("aspear-berry"),  effect: { type: "none" }, isChampionsItem: true },
  { slug: "persim-berry",  name: "Persim Berry",  spriteUrl: SPRITE("persim-berry"),  effect: { type: "none" }, isChampionsItem: true },
  { slug: "leppa-berry",   name: "Leppa Berry",   spriteUrl: SPRITE("leppa-berry"),   effect: { type: "none" }, isChampionsItem: true },

  // ── Champions Berries — type-resist (defender item) ───────────────────────────
  { slug: "occa-berry",    name: "Occa Berry",    spriteUrl: SPRITE("occa-berry"),    effect: { type: "type_resist_berry", poketype: "fire",     mult: 0.5 }, isChampionsItem: true },
  { slug: "passho-berry",  name: "Passho Berry",  spriteUrl: SPRITE("passho-berry"),  effect: { type: "type_resist_berry", poketype: "water",    mult: 0.5 }, isChampionsItem: true },
  { slug: "wacan-berry",   name: "Wacan Berry",   spriteUrl: SPRITE("wacan-berry"),   effect: { type: "type_resist_berry", poketype: "electric", mult: 0.5 }, isChampionsItem: true },
  { slug: "rindo-berry",   name: "Rindo Berry",   spriteUrl: SPRITE("rindo-berry"),   effect: { type: "type_resist_berry", poketype: "grass",    mult: 0.5 }, isChampionsItem: true },
  { slug: "yache-berry",   name: "Yache Berry",   spriteUrl: SPRITE("yache-berry"),   effect: { type: "type_resist_berry", poketype: "ice",      mult: 0.5 }, isChampionsItem: true },
  { slug: "chople-berry",  name: "Chople Berry",  spriteUrl: SPRITE("chople-berry"),  effect: { type: "type_resist_berry", poketype: "fighting", mult: 0.5 }, isChampionsItem: true },
  { slug: "kebia-berry",   name: "Kebia Berry",   spriteUrl: SPRITE("kebia-berry"),   effect: { type: "type_resist_berry", poketype: "poison",   mult: 0.5 }, isChampionsItem: true },
  { slug: "shuca-berry",   name: "Shuca Berry",   spriteUrl: SPRITE("shuca-berry"),   effect: { type: "type_resist_berry", poketype: "ground",   mult: 0.5 }, isChampionsItem: true },
  { slug: "coba-berry",    name: "Coba Berry",    spriteUrl: SPRITE("coba-berry"),    effect: { type: "type_resist_berry", poketype: "flying",   mult: 0.5 }, isChampionsItem: true },
  { slug: "payapa-berry",  name: "Payapa Berry",  spriteUrl: SPRITE("payapa-berry"),  effect: { type: "type_resist_berry", poketype: "psychic",  mult: 0.5 }, isChampionsItem: true },
  { slug: "tanga-berry",   name: "Tanga Berry",   spriteUrl: SPRITE("tanga-berry"),   effect: { type: "type_resist_berry", poketype: "bug",      mult: 0.5 }, isChampionsItem: true },
  { slug: "charti-berry",  name: "Charti Berry",  spriteUrl: SPRITE("charti-berry"),  effect: { type: "type_resist_berry", poketype: "rock",     mult: 0.5 }, isChampionsItem: true },
  { slug: "kasib-berry",   name: "Kasib Berry",   spriteUrl: SPRITE("kasib-berry"),   effect: { type: "type_resist_berry", poketype: "ghost",    mult: 0.5 }, isChampionsItem: true },
  { slug: "haban-berry",   name: "Haban Berry",   spriteUrl: SPRITE("haban-berry"),   effect: { type: "type_resist_berry", poketype: "dragon",   mult: 0.5 }, isChampionsItem: true },
  { slug: "colbur-berry",  name: "Colbur Berry",  spriteUrl: SPRITE("colbur-berry"),  effect: { type: "type_resist_berry", poketype: "dark",     mult: 0.5 }, isChampionsItem: true },
  { slug: "babiri-berry",  name: "Babiri Berry",  spriteUrl: SPRITE("babiri-berry"),  effect: { type: "type_resist_berry", poketype: "steel",    mult: 0.5 }, isChampionsItem: true },
  { slug: "chilan-berry",  name: "Chilan Berry",  spriteUrl: SPRITE("chilan-berry"),  effect: { type: "type_resist_berry", poketype: "normal",   mult: 0.5 }, isChampionsItem: true },
  { slug: "roseli-berry",  name: "Roseli Berry",  spriteUrl: SPRITE("roseli-berry"),  effect: { type: "type_resist_berry", poketype: "fairy",    mult: 0.5 }, isChampionsItem: true },

  // ── Champions Mega Stones — standard (PokeAPI sprites available) ──────────────
  { slug: "abomasite",      name: "Abomasite",      spriteUrl: SPRITE("abomasite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "absolite",       name: "Absolite",       spriteUrl: SPRITE("absolite"),       effect: { type: "none" }, isChampionsItem: true },
  { slug: "aerodactylite",  name: "Aerodactylite",  spriteUrl: SPRITE("aerodactylite"),  effect: { type: "none" }, isChampionsItem: true },
  { slug: "aggronite",      name: "Aggronite",      spriteUrl: SPRITE("aggronite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "alakazite",      name: "Alakazite",      spriteUrl: SPRITE("alakazite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "altarianite",    name: "Altarianite",    spriteUrl: SPRITE("altarianite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "ampharosite",    name: "Ampharosite",    spriteUrl: SPRITE("ampharosite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "audinite",       name: "Audinite",       spriteUrl: SPRITE("audinite"),       effect: { type: "none" }, isChampionsItem: true },
  { slug: "banettite",      name: "Banettite",      spriteUrl: SPRITE("banettite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "beedrillite",    name: "Beedrillite",    spriteUrl: SPRITE("beedrillite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "blastoisinite",  name: "Blastoisinite",  spriteUrl: SPRITE("blastoisinite"),  effect: { type: "none" }, isChampionsItem: true },
  { slug: "cameruptite",    name: "Cameruptite",    spriteUrl: SPRITE("cameruptite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "charizardite-x", name: "Charizardite X", spriteUrl: SPRITE("charizardite-x"), effect: { type: "none" }, isChampionsItem: true },
  { slug: "charizardite-y", name: "Charizardite Y", spriteUrl: SPRITE("charizardite-y"), effect: { type: "none" }, isChampionsItem: true },
  { slug: "clefablite",     name: "Clefablite",     spriteUrl: SPRITE("clefablite"),     effect: { type: "none" }, isChampionsItem: true },
  { slug: "froslassite",    name: "Froslassite",    spriteUrl: SPRITE("froslassite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "galladite",      name: "Galladite",      spriteUrl: SPRITE("galladite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "garchompite",    name: "Garchompite",    spriteUrl: SPRITE("garchompite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "gardevoirite",   name: "Gardevoirite",   spriteUrl: SPRITE("gardevoirite"),   effect: { type: "none" }, isChampionsItem: true },
  { slug: "gengarite",      name: "Gengarite",      spriteUrl: SPRITE("gengarite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "glalitite",      name: "Glalitite",      spriteUrl: SPRITE("glalitite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "gyaradosite",    name: "Gyaradosite",    spriteUrl: SPRITE("gyaradosite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "heracronite",    name: "Heracronite",    spriteUrl: SPRITE("heracronite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "houndoominite",  name: "Houndoominite",  spriteUrl: SPRITE("houndoominite"),  effect: { type: "none" }, isChampionsItem: true },
  { slug: "kangaskhanite",  name: "Kangaskhanite",  spriteUrl: SPRITE("kangaskhanite"),  effect: { type: "none" }, isChampionsItem: true },
  { slug: "lopunnite",      name: "Lopunnite",      spriteUrl: SPRITE("lopunnite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "lucarionite",    name: "Lucarionite",    spriteUrl: SPRITE("lucarionite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "manectite",      name: "Manectite",      spriteUrl: SPRITE("manectite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "medichamite",    name: "Medichamite",    spriteUrl: SPRITE("medichamite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "pidgeotite",     name: "Pidgeotite",     spriteUrl: SPRITE("pidgeotite"),     effect: { type: "none" }, isChampionsItem: true },
  { slug: "pinsirite",      name: "Pinsirite",      spriteUrl: SPRITE("pinsirite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "sablenite",      name: "Sablenite",      spriteUrl: SPRITE("sablenite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "scizorite",      name: "Scizorite",      spriteUrl: SPRITE("scizorite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "sharpedonite",   name: "Sharpedonite",   spriteUrl: SPRITE("sharpedonite"),   effect: { type: "none" }, isChampionsItem: true },
  { slug: "slowbronite",    name: "Slowbronite",    spriteUrl: SPRITE("slowbronite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "steelixite",     name: "Steelixite",     spriteUrl: SPRITE("steelixite"),     effect: { type: "none" }, isChampionsItem: true },
  { slug: "tyranitarite",   name: "Tyranitarite",   spriteUrl: SPRITE("tyranitarite"),   effect: { type: "none" }, isChampionsItem: true },
  { slug: "venusaurite",    name: "Venusaurite",    spriteUrl: SPRITE("venusaurite"),    effect: { type: "none" }, isChampionsItem: true },

  // ── Champions Mega Stones — no PokeAPI sprite (Champions-exclusive) ───────────
  { slug: "chesnaughtite",  name: "Chesnaughtite",  spriteUrl: "", effect: { type: "none" }, isChampionsItem: true },
  { slug: "chimechite",     name: "Chimechite",     spriteUrl: "", effect: { type: "none" }, isChampionsItem: true },
  { slug: "crabominite",    name: "Crabominite",    spriteUrl: "", effect: { type: "none" }, isChampionsItem: true },
  { slug: "delphoxite",     name: "Delphoxite",     spriteUrl: "", effect: { type: "none" }, isChampionsItem: true },
  { slug: "dragoninite",    name: "Dragoninite",    spriteUrl: "", effect: { type: "none" }, isChampionsItem: true },
  { slug: "drampanite",     name: "Drampanite",     spriteUrl: "", effect: { type: "none" }, isChampionsItem: true },
  { slug: "emboarite",      name: "Emboarite",      spriteUrl: "", effect: { type: "none" }, isChampionsItem: true },
  { slug: "excadrite",      name: "Excadrite",      spriteUrl: "", effect: { type: "none" }, isChampionsItem: true },
  { slug: "feraligite",     name: "Feraligite",     spriteUrl: "", effect: { type: "none" }, isChampionsItem: true },
  { slug: "floettite",      name: "Floettite",      spriteUrl: "", effect: { type: "none" }, isChampionsItem: true },
  { slug: "glimmoranite",   name: "Glimmoranite",   spriteUrl: "", effect: { type: "none" }, isChampionsItem: true },
  { slug: "golurkite",      name: "Golurkite",      spriteUrl: "", effect: { type: "none" }, isChampionsItem: true },
  { slug: "greninjite",     name: "Greninjite",     spriteUrl: "", effect: { type: "none" }, isChampionsItem: true },
  { slug: "hawluchanite",   name: "Hawluchanite",   spriteUrl: "", effect: { type: "none" }, isChampionsItem: true },
  { slug: "meganiumite",    name: "Meganiumite",    spriteUrl: "", effect: { type: "none" }, isChampionsItem: true },
  { slug: "meowsticite",    name: "Meowsticite",    spriteUrl: "", effect: { type: "none" }, isChampionsItem: true },
  { slug: "scovillainite",  name: "Scovillainite",  spriteUrl: "", effect: { type: "none" }, isChampionsItem: true },
  { slug: "skarmorite",     name: "Skarmorite",     spriteUrl: "", effect: { type: "none" }, isChampionsItem: true },
  { slug: "starminite",     name: "Starminite",     spriteUrl: "", effect: { type: "none" }, isChampionsItem: true },
  { slug: "victreebelite",  name: "Victreebelite",  spriteUrl: "", effect: { type: "none" }, isChampionsItem: true },
];

export function getItemAttackMult(item: CompetitiveItem, moveCategory: string): number {
  const { effect } = item;
  if (effect.type !== "attack_mult") return 1;
  if (effect.category === "any") return effect.mult;
  if (effect.category === "physical" && moveCategory === "physical") return effect.mult;
  if (effect.category === "special"  && moveCategory === "special")  return effect.mult;
  return 1;
}

export function getItemDefenseMult(
  item: CompetitiveItem,
  moveCategory: string,
  moveType?: PokemonType,
): number {
  const { effect } = item;
  if (effect.type === "defense_mult" && moveCategory === "special") return effect.mult;
  if (effect.type === "type_resist_berry" && moveType === effect.poketype) return effect.mult;
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
