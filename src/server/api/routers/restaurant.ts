import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";

export const restaurantRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        location: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const restaurant = await ctx.db.restaurant.create({
        data: {
          name: input.name,
          location: input.location,
          userId: ctx.userId,
        },
      });

      return restaurant;
    }),

  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(6),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;

      const restaurants = await ctx.db.restaurant.findMany({
        where: { userId: ctx.userId },
        take: limit + 1, // Take one extra to check if there's a next page
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: string | undefined = undefined;
      if (restaurants.length > limit) {
        const nextItem = restaurants.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: restaurants,
        nextCursor,
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const restaurant = await ctx.db.restaurant.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
        include: {
          categories: {
            orderBy: { name: "asc" },
          },
          dishes: {
            include: {
              categories: {
                include: {
                  category: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!restaurant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Restaurant not found",
        });
      }

      return restaurant;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        location: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify ownership
      const restaurant = await ctx.db.restaurant.findFirst({
        where: {
          id,
          userId: ctx.userId,
        },
      });

      if (!restaurant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Restaurant not found",
        });
      }

      const updated = await ctx.db.restaurant.update({
        where: { id },
        data,
      });

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const restaurant = await ctx.db.restaurant.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      });

      if (!restaurant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Restaurant not found",
        });
      }

      await ctx.db.restaurant.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  getPublicMenu: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const restaurant = await ctx.db.restaurant.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          location: true,
          categories: {
            orderBy: { name: "asc" },
            include: {
              dishes: {
                include: {
                  dish: {
                    include: {
                      categories: {
                        include: {
                          category: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!restaurant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Restaurant not found",
        });
      }

      // Transform data for easier consumption
      const categories = restaurant.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        dishes: cat.dishes.map((dc) => ({
          id: dc.dish.id,
          name: dc.dish.name,
          description: dc.dish.description,
          image: dc.dish.image,
          price: dc.dish.price,
          spiceLevel: dc.dish.spiceLevel,
          isVegetarian: dc.dish.isVegetarian,
        })),
      }));

      return {
        id: restaurant.id,
        name: restaurant.name,
        location: restaurant.location,
        categories,
      };
    }),
});

