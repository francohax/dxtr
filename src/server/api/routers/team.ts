import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const MoveInput = z.object({
  position: z.number().min(0).max(3),
  pokeApiId: z.number(),
  name: z.string(),
  type: z.string(),
  category: z.string(),
  power: z.number().nullable(),
  accuracy: z.number().nullable(),
  pp: z.number(),
});

const SlotInput = z.object({
  position: z.number().min(0).max(5),
  pokeApiId: z.number(),
  name: z.string(),
  sprite: z.string(),
  types: z.array(z.string()),
  moves: z.array(MoveInput),
});

export const teamRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ name: z.string().min(1).max(60), slots: z.array(SlotInput).min(1).max(6) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.team.create({
        data: {
          name: input.name,
          slots: {
            create: input.slots.map(slot => ({
              position: slot.position,
              pokeApiId: slot.pokeApiId,
              name: slot.name,
              sprite: slot.sprite,
              types: slot.types,
              moves: {
                create: slot.moves.map(move => ({
                  position: move.position,
                  pokeApiId: move.pokeApiId,
                  name: move.name,
                  type: move.type,
                  category: move.category,
                  power: move.power,
                  accuracy: move.accuracy,
                  pp: move.pp,
                })),
              },
            })),
          },
        },
        include: { slots: { include: { moves: true } } },
      });
    }),

  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.team.findMany({
      orderBy: { createdAt: "desc" },
      include: { slots: { include: { moves: true }, orderBy: { position: "asc" } } },
    });
  }),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.team.findUnique({
        where: { id: input.id },
        include: { slots: { include: { moves: { orderBy: { position: "asc" } } }, orderBy: { position: "asc" } } },
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.team.delete({ where: { id: input.id } });
    }),
});
