import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const categoryRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        name: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify restaurant ownership
      const restaurant = await ctx.db.restaurant.findFirst({
        where: {
          id: input.restaurantId,
          userId: ctx.userId,
        },
      });

      if (!restaurant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Restaurant not found",
        });
      }

      const category = await ctx.db.category.create({
        data: {
          name: input.name,
          restaurantId: input.restaurantId,
        },
      });

      return category;
    }),

  getAll: protectedProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        limit: z.number().min(1).max(50).default(6),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { restaurantId, limit, cursor } = input;

      // Verify restaurant ownership
      const restaurant = await ctx.db.restaurant.findFirst({
        where: {
          id: restaurantId,
          userId: ctx.userId,
        },
      });

      if (!restaurant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Restaurant not found",
        });
      }

      const categories = await ctx.db.category.findMany({
        where: { restaurantId },
        take: limit + 1, // Take one extra to check if there's a next page
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { name: "asc" },
      });

      let nextCursor: string | undefined = undefined;
      if (categories.length > limit) {
        const nextItem = categories.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: categories,
        nextCursor,
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const category = await ctx.db.category.findUnique({
        where: { id: input.id },
        include: { restaurant: true },
      });

      if (!category || category.restaurant.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      const updated = await ctx.db.category.update({
        where: { id: input.id },
        data: { name: input.name },
      });

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const category = await ctx.db.category.findUnique({
        where: { id: input.id },
        include: { restaurant: true },
      });

      if (!category || category.restaurant.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      await ctx.db.category.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});

