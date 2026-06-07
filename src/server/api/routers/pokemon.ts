import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { fetchPokemon, fetchMove, fetchAllPokemonNames } from "~/lib/pokeapi";
import { type PokemonSummary, type PokemonType } from "~/lib/types";
import { type CachedPokemon } from "../../../../generated/prisma/index.js";

// Full Pokémon Champions roster + Mega Evolutions (from Bulbapedia).
const CHAMPIONS_POOL = [
  // Gen 1
  "venusaur", "venusaur-mega",
  "charizard", "charizard-mega-x", "charizard-mega-y",
  "blastoise", "blastoise-mega",
  "beedrill", "beedrill-mega",
  "pidgeot", "pidgeot-mega",
  "arbok", "pikachu",
  "raichu", "raichu-alola",
  "clefable",
  "ninetales", "ninetales-alola",
  "arcanine", "arcanine-hisui",
  "alakazam", "alakazam-mega",
  "machamp", "victreebel",
  "slowbro", "slowbro-mega", "slowbro-galar",
  "gengar", "gengar-mega",
  "kangaskhan", "kangaskhan-mega",
  "starmie",
  "pinsir", "pinsir-mega",
  "tauros", "tauros-paldea-combat", "tauros-paldea-blaze", "tauros-paldea-aqua",
  "gyarados", "gyarados-mega",
  "ditto",
  "vaporeon", "jolteon", "flareon",
  "aerodactyl", "aerodactyl-mega",
  "snorlax", "dragonite",
  // Gen 2
  "meganium",
  "typhlosion", "typhlosion-hisui",
  "feraligatr", "ariados",
  "ampharos", "ampharos-mega",
  "azumarill", "politoed",
  "espeon", "umbreon",
  "slowking", "slowking-galar",
  "forretress",
  "steelix", "steelix-mega",
  "scizor", "scizor-mega",
  "heracross", "heracross-mega",
  "skarmory",
  "houndoom", "houndoom-mega",
  "tyranitar", "tyranitar-mega",
  // Gen 3
  "pelipper",
  "gardevoir", "gardevoir-mega",
  "sableye", "sableye-mega",
  "aggron", "aggron-mega",
  "medicham", "medicham-mega",
  "manectric", "manectric-mega",
  "sharpedo", "sharpedo-mega",
  "camerupt", "camerupt-mega",
  "torkoal",
  "altaria", "altaria-mega",
  "milotic", "castform",
  "banette", "banette-mega",
  "chimecho",
  "absol", "absol-mega",
  "glalie", "glalie-mega",
  // Gen 4
  "torterra", "infernape", "empoleon",
  "luxray", "roserade", "rampardos", "bastiodon",
  "lopunny", "lopunny-mega",
  "spiritomb",
  "garchomp", "garchomp-mega",
  "lucario", "lucario-mega",
  "hippowdon", "toxicroak",
  "abomasnow", "abomasnow-mega",
  "weavile", "rhyperior",
  "leafeon", "glaceon",
  "gliscor", "mamoswine",
  "gallade", "gallade-mega",
  "froslass",
  "rotom", "rotom-heat", "rotom-wash", "rotom-frost", "rotom-fan", "rotom-mow",
  // Gen 5
  "serperior", "emboar",
  "samurott", "samurott-hisui",
  "watchog", "liepard",
  "simisage", "simisear", "simipour",
  "excadrill",
  "audino", "audino-mega",
  "conkeldurr", "whimsicott", "krookodile",
  "cofagrigus", "garbodor",
  "zoroark", "zoroark-hisui",
  "reuniclus", "vanilluxe", "emolga", "chandelure", "beartic",
  "stunfisk", "stunfisk-galar",
  "golurk", "hydreigon", "volcarona",
  // Gen 6
  "chesnaught", "delphox", "greninja",
  "diggersby", "talonflame", "vivillon",
  "floette", "florges",
  "pangoro", "furfrou",
  "meowstic", "meowstic-female",
  "aegislash", "aromatisse", "slurpuff",
  "clawitzer", "heliolisk",
  "tyrantrum", "aurorus",
  "sylveon", "hawlucha", "dedenne",
  "goodra", "goodra-hisui",
  "klefki", "trevenant",
  "gourgeist", "gourgeist-small", "gourgeist-large", "gourgeist-super",
  "avalugg", "avalugg-hisui",
  "noivern",
  // Gen 7
  "decidueye", "decidueye-hisui",
  "incineroar", "primarina",
  "toucannon", "crabominable",
  "lycanroc", "lycanroc-midnight", "lycanroc-dusk",
  "toxapex", "mudsdale", "araquanid",
  "salazzle", "tsareena",
  "oranguru", "passimian",
  "mimikyu", "drampa", "kommo-o",
  // Gen 8
  "corviknight",
  "flapple", "appletun",
  "sandaconda", "polteageist", "hatterene",
  "mr-rime", "runerigus", "alcremie", "morpeko",
  "dragapult",
  "wyrdeer", "kleavor",
  "basculegion", "basculegion-female",
  "sneasler",
  // Gen 9
  "meowscarada", "skeledirge", "quaquaval",
  "maushold", "garganacl",
  "armarouge", "ceruledge",
  "bellibolt", "scovillain", "espathra",
  "tinkaton", "palafin", "orthworm", "glimmora",
  "farigiraf", "kingambit",
  "sinistcha", "archaludon", "hydrapple",
];

function dbToSummary(p: CachedPokemon): PokemonSummary {
  return {
    pokeApiId: p.id,
    name: p.name,
    sprite: p.sprite,
    types: p.types as PokemonType[],
    baseStats: {
      hp: p.hp,
      attack: p.attack,
      defense: p.defense,
      spAttack: p.spAttack,
      spDefense: p.spDefense,
      speed: p.speed,
    },
    moveNames: p.moveNames,
  };
}

function summaryToDbShape(p: PokemonSummary) {
  return {
    id: p.pokeApiId,
    name: p.name,
    sprite: p.sprite,
    types: p.types,
    hp: p.baseStats.hp,
    attack: p.baseStats.attack,
    defense: p.baseStats.defense,
    spAttack: p.baseStats.spAttack,
    spDefense: p.baseStats.spDefense,
    speed: p.baseStats.speed,
    moveNames: p.moveNames,
  };
}

export const pokemonRouter = createTRPCRouter({
  // All Pokemon names ordered by PokeAPI id.
  // Reads from DB cache; falls back to PokeAPI if cache is empty.
  listNames: publicProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.cachedPokemon.count();
    if (count === 0) return fetchAllPokemonNames();
    const rows = await ctx.db.cachedPokemon.findMany({
      select: { name: true },
      orderBy: { id: "asc" },
    });
    return rows.map((r) => r.name);
  }),

  // { id, name, types, sprite }[] for every cached Pokemon — used by the type-filter picker and search rows.
  listSummaries: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.cachedPokemon.findMany({
      select: { id: true, name: true, types: true, sprite: true },
      orderBy: { id: "asc" },
    });
  }),

  // Fetch a single Pokemon. Checks DB cache first, then falls back to PokeAPI and writes back.
  search: publicProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ input, ctx }) => {
      const q = input.query.toLowerCase().trim();
      const cached = await ctx.db.cachedPokemon.findFirst({ where: { name: q } });
      if (cached) return dbToSummary(cached);
      try {
        const p = await fetchPokemon(q);
        const shape = summaryToDbShape(p);
        await ctx.db.cachedPokemon.upsert({
          where: { name: p.name },
          create: shape,
          update: { sprite: shape.sprite, types: shape.types, hp: shape.hp, attack: shape.attack, defense: shape.defense, spAttack: shape.spAttack, spDefense: shape.spDefense, speed: shape.speed, moveNames: shape.moveNames },
        });
        return p;
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Pokemon "${input.query}" not found.`,
        });
      }
    }),

  // Force-refresh a cached Pokemon: deletes stale row then re-fetches from PokeAPI.
  refresh: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const name = input.name.toLowerCase().trim();
      await ctx.db.cachedPokemon.deleteMany({ where: { name } });
      try {
        const p = await fetchPokemon(name);
        const shape = summaryToDbShape(p);
        await ctx.db.cachedPokemon.upsert({
          where: { name: p.name },
          create: shape,
          update: { sprite: shape.sprite, types: shape.types, hp: shape.hp, attack: shape.attack, defense: shape.defense, spAttack: shape.spAttack, spDefense: shape.spDefense, speed: shape.speed, moveNames: shape.moveNames },
        });
        return p;
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Pokemon "${input.name}" not found.`,
        });
      }
    }),

  getMove: publicProcedure
    .input(z.object({ moveName: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        return await fetchMove(input.moveName);
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Move "${input.moveName}" not found.`,
        });
      }
    }),

  getPokemonByMove: publicProcedure
    .input(z.object({ moveName: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      return ctx.db.cachedPokemon.findMany({
        where: { moveNames: { has: input.moveName } },
        select: { id: true, name: true, sprite: true, types: true },
        orderBy: { id: "asc" },
      });
    }),

  // Returns the full Pokémon Champions roster with sprite + types.
  // Checks DB cache first; fetches from PokeAPI for any missing and writes them back.
  getVgcTopPicks: publicProcedure.query(async ({ ctx }) => {
    const cached = await ctx.db.cachedPokemon.findMany({
      where: { name: { in: CHAMPIONS_POOL } },
      select: { name: true, sprite: true, types: true },
    });
    const found = new Map(cached.map(p => [p.name, { name: p.name, sprite: p.sprite, types: p.types }]));

    // Fetch any missing entries from PokeAPI and write-back to DB cache
    const missing = CHAMPIONS_POOL.filter(n => !found.has(n));
    if (missing.length > 0) {
      const results = await Promise.allSettled(missing.map(n => fetchPokemon(n)));
      const writes: Promise<unknown>[] = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          const p = r.value;
          found.set(missing[i]!, { name: p.name, sprite: p.sprite, types: p.types });
          const shape = summaryToDbShape(p);
          writes.push(
            ctx.db.cachedPokemon.upsert({
              where: { name: p.name },
              create: shape,
              update: { sprite: shape.sprite, types: shape.types, hp: shape.hp, attack: shape.attack, defense: shape.defense, spAttack: shape.spAttack, spDefense: shape.spDefense, speed: shape.speed, moveNames: shape.moveNames },
            })
          );
        }
      });
      if (writes.length > 0) await Promise.allSettled(writes);
    }

    return CHAMPIONS_POOL
      .map(n => found.get(n))
      .filter((p): p is NonNullable<typeof p> => p != null);
  }),
});
