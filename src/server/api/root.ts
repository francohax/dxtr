import { pokemonRouter } from "~/server/api/routers/pokemon";
import { teamRouter } from "~/server/api/routers/team";
import { calcRouter } from "~/server/api/routers/calc";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  pokemon: pokemonRouter,
  team:    teamRouter,
  calc:    calcRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
