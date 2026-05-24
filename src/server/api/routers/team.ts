import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { fetchPokemon } from "~/lib/pokeapi";
import { type MoveCategory, type PokemonType, type TeamSlotConfig } from "~/lib/types";

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
  nature: z.string().default("hardy"),
  evHp: z.number().min(0).max(252).default(0),
  evAtk: z.number().min(0).max(252).default(0),
  evDef: z.number().min(0).max(252).default(0),
  evSpAtk: z.number().min(0).max(252).default(0),
  evSpDef: z.number().min(0).max(252).default(0),
  evSpeed: z.number().min(0).max(252).default(0),
  ivHp: z.number().min(0).max(31).default(0),
  ivAtk: z.number().min(0).max(31).default(0),
  ivDef: z.number().min(0).max(31).default(0),
  ivSpAtk: z.number().min(0).max(31).default(0),
  ivSpDef: z.number().min(0).max(31).default(0),
  ivSpeed: z.number().min(0).max(31).default(0),
  ivsEnabled: z.boolean().default(false),
  moves: z.array(MoveInput),
});

export const teamRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(60), slots: z.array(SlotInput).min(1).max(6) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.team.create({
        data: {
          name:   input.name,
          userId: ctx.userId,
          slots: {
            create: input.slots.map(slot => ({
              position: slot.position,
              pokeApiId: slot.pokeApiId,
              name: slot.name,
              sprite: slot.sprite,
              types: slot.types,
              nature: slot.nature,
              evHp: slot.evHp,
              evAtk: slot.evAtk,
              evDef: slot.evDef,
              evSpAtk: slot.evSpAtk,
              evSpDef: slot.evSpDef,
              evSpeed: slot.evSpeed,
              ivHp: slot.ivHp,
              ivAtk: slot.ivAtk,
              ivDef: slot.ivDef,
              ivSpAtk: slot.ivSpAtk,
              ivSpDef: slot.ivSpDef,
              ivSpeed: slot.ivSpeed,
              ivsEnabled: slot.ivsEnabled,
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

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.team.findMany({
      where:   { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      include: {
        slots: {
          include: { moves: true },
          orderBy: { position: "asc" },
        },
      },
    });
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.team.findFirst({
        where: { id: input.id, userId: ctx.userId },
        include: {
          slots: {
            include: { moves: { orderBy: { position: "asc" } } },
            orderBy: { position: "asc" },
          },
        },
      });
    }),

  loadForBuilder: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const team = await ctx.db.team.findFirst({
        where: { id: input.id, userId: ctx.userId },
        include: {
          slots: {
            include: { moves: { orderBy: { position: "asc" } } },
            orderBy: { position: "asc" },
          },
        },
      });
      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });

      const slots = await Promise.all(
        team.slots.map(async (slot): Promise<TeamSlotConfig> => {
          const pokemon = await fetchPokemon(slot.pokeApiId);
          return {
            position: slot.position,
            pokemon,
            moves: slot.moves.map(m => ({
              pokeApiId: m.pokeApiId,
              name: m.name,
              type: m.type as PokemonType,
              category: m.category as MoveCategory,
              power: m.power,
              accuracy: m.accuracy,
              pp: m.pp,
              effect: null,
              effectChance: null,
            })),
            nature: slot.nature,
            evs: {
              hp: slot.evHp,
              attack: slot.evAtk,
              defense: slot.evDef,
              spAttack: slot.evSpAtk,
              spDefense: slot.evSpDef,
              speed: slot.evSpeed,
            },
            ivs: {
              hp: slot.ivHp,
              attack: slot.ivAtk,
              defense: slot.ivDef,
              spAttack: slot.ivSpAtk,
              spDefense: slot.ivSpDef,
              speed: slot.ivSpeed,
            },
            ivsEnabled: slot.ivsEnabled,
          };
        })
      );
      return slots;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.team.deleteMany({ where: { id: input.id, userId: ctx.userId } });
    }),
});
