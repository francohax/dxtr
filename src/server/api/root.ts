import { pokemonRouter } from "~/server/api/routers/pokemon";
import { teamRouter } from "~/server/api/routers/team";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  pokemon: pokemonRouter,
  team: teamRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
