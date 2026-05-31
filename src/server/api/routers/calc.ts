import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const calcRouter = createTRPCRouter({
  save: protectedProcedure
    .input(
      z.object({
        attackerName:   z.string(),
        attackerSprite: z.string(),
        attackerTypes:  z.array(z.string()),
        defenderName:   z.string(),
        defenderSprite: z.string(),
        defenderTypes:  z.array(z.string()),
        moveName:       z.string(),
        moveType:       z.string(),
        movePower:      z.number().nullable(),
        minPercent:     z.number(),
        maxPercent:     z.number(),
        // Extended state
        attackerItemSlug:  z.string().nullable().optional(),
        defenderItemSlug:  z.string().nullable().optional(),
        attackerNature:    z.string().default("hardy"),
        defenderNature:    z.string().default("hardy"),
        attackerAtkEv:     z.number().default(0),
        attackerSpAEv:     z.number().default(0),
        defenderDefEv:     z.number().default(0),
        defenderSpDEv:     z.number().default(0),
        attackerAtkStage:  z.number().default(0),
        attackerSpAStage:  z.number().default(0),
        defenderDefStage:  z.number().default(0),
        defenderSpDStage:  z.number().default(0),
        battleLevel:       z.number().default(50),
        weather:           z.string().default("none"),
        terrain:           z.string().default("none"),
        isCritical:        z.boolean().default(false),
        attackerBurned:    z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.savedCalc.create({
        data: {
          ...input,
          userId:          ctx.userId,
          movePower:       input.movePower ?? undefined,
          attackerItemSlug: input.attackerItemSlug ?? undefined,
          defenderItemSlug: input.defenderItemSlug ?? undefined,
        },
      });
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.savedCalc.findMany({
      where:   { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take:    50,
    });
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.savedCalc.deleteMany({
        where: { id: input.id, userId: ctx.userId },
      });
    }),
});
