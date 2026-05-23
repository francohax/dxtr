import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { fetchPokemon, fetchMove, fetchAllPokemonNames } from "~/lib/pokeapi";
import { type PokemonSummary, type PokemonType } from "~/lib/types";
import { type CachedPokemon } from "../../../../generated/prisma/index.js";

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

  // { name, types }[] for every cached Pokemon — used by the type-filter picker.
  listSummaries: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.cachedPokemon.findMany({
      select: { name: true, types: true },
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
});
