import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { fetchPokemon, fetchMove, fetchAllPokemonNames } from "~/lib/pokeapi";
import { type PokemonSummary, type PokemonType } from "~/lib/types";
import { type CachedPokemon } from "../../../../generated/prisma/index.js";

// Top 20 Pokemon Champions (VGC 2026 Reg M-A) ordered by usage.
const VGC_TOP20 = [
  "sneasler", "garchomp", "kingambit", "basculegion", "incineroar",
  "sinistcha", "charizard-mega-y", "pelipper", "aerodactyl", "archaludon",
  "rotom-wash", "farigiraf", "milotic", "whimsicott", "rillaboom",
  "iron-hands", "roaring-moon", "flutter-mane", "greninja", "iron-bundle",
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

  // Fetch a single Pokemon. Checks DB cache first, then falls back to PokeAPI.
  search: publicProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ input, ctx }) => {
      const q = input.query.toLowerCase().trim();
      const cached = await ctx.db.cachedPokemon.findFirst({ where: { name: q } });
      if (cached) return dbToSummary(cached);
      try {
        return await fetchPokemon(q);
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Pokemon "${input.query}" not found.`,
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

  // Returns top-20 Pokemon Champions picks with sprite + types.
  // Checks DB cache first; fetches from PokeAPI (24h HTTP cache) for any missing.
  getVgcTopPicks: publicProcedure.query(async ({ ctx }) => {
    const cached = await ctx.db.cachedPokemon.findMany({
      where: { name: { in: VGC_TOP20 } },
      select: { name: true, sprite: true, types: true },
    });
    const found = new Map(cached.map(p => [p.name, { name: p.name, sprite: p.sprite, types: p.types as string[] }]));

    // Fetch any missing entries from PokeAPI (Next.js fetch provides 24h caching)
    const missing = VGC_TOP20.filter(n => !found.has(n));
    if (missing.length > 0) {
      const results = await Promise.allSettled(missing.map(n => fetchPokemon(n)));
      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          found.set(missing[i]!, { name: r.value.name, sprite: r.value.sprite, types: r.value.types });
        }
      });
    }

    return VGC_TOP20
      .map(n => found.get(n))
      .filter((p): p is NonNullable<typeof p> => p != null);
  }),
});
