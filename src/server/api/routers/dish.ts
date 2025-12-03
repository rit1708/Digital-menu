import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const dishRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        restaurantId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        image: z.string().optional(),
        price: z.number().optional(),
        spiceLevel: z.number().min(0).max(5).optional(),
        isVegetarian: z.boolean().optional().default(true),
        categoryIds: z.array(z.string()).optional(),
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

      // Create dish
      const dish = await ctx.db.dish.create({
        data: {
          name: input.name,
          description: input.description,
          image: input.image,
          price: input.price,
          spiceLevel: input.spiceLevel,
          isVegetarian: input.isVegetarian ?? true,
          restaurantId: input.restaurantId,
        },
      });

      // Add to categories if provided
      if (input.categoryIds && input.categoryIds.length > 0) {
        // Verify all categories belong to this restaurant
        const categories = await ctx.db.category.findMany({
          where: {
            id: { in: input.categoryIds },
            restaurantId: input.restaurantId,
          },
        });

        if (categories.length !== input.categoryIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Some categories do not belong to this restaurant",
          });
        }

        await ctx.db.dishCategory.createMany({
          data: input.categoryIds.map((categoryId) => ({
            dishId: dish.id,
            categoryId,
          })),
        });
      }

      return dish;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        image: z.string().optional().nullable(),
        price: z.number().optional().nullable(),
        spiceLevel: z.number().min(0).max(5).optional().nullable(),
        isVegetarian: z.boolean().optional().nullable(),
        categoryIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, categoryIds, ...data } = input;

      // Verify dish ownership
      const dish = await ctx.db.dish.findUnique({
        where: { id },
        include: { restaurant: true },
      });

      if (!dish || dish.restaurant.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dish not found",
        });
      }

      // Update dish
      const updated = await ctx.db.dish.update({
        where: { id },
        data: {
          ...data,
          description: data.description === null ? null : data.description,
          image: data.image === null ? null : data.image,
          price: data.price === null ? null : data.price,
          spiceLevel: data.spiceLevel === null ? null : data.spiceLevel,
          isVegetarian: data.isVegetarian === null ? undefined : data.isVegetarian,
        },
      });

      // Update categories if provided
      if (categoryIds !== undefined) {
        // Remove existing category associations
        await ctx.db.dishCategory.deleteMany({
          where: { dishId: id },
        });

        // Add new category associations
        if (categoryIds.length > 0) {
          // Verify all categories belong to this restaurant
          const categories = await ctx.db.category.findMany({
            where: {
              id: { in: categoryIds },
              restaurantId: dish.restaurantId,
            },
          });

          if (categories.length !== categoryIds.length) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Some categories do not belong to this restaurant",
            });
          }

          await ctx.db.dishCategory.createMany({
            data: categoryIds.map((categoryId) => ({
              dishId: id,
              categoryId,
            })),
          });
        }
      }

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify dish ownership
      const dish = await ctx.db.dish.findUnique({
        where: { id: input.id },
        include: { restaurant: true },
      });

      if (!dish || dish.restaurant.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dish not found",
        });
      }

      await ctx.db.dish.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  getByRestaurant: protectedProcedure
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

      const dishes = await ctx.db.dish.findMany({
        where: { restaurantId },
        take: limit + 1, // Take one extra to check if there's a next page
        cursor: cursor ? { id: cursor } : undefined,
        include: {
          categories: {
            include: {
              category: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: string | undefined = undefined;
      if (dishes.length > limit) {
        const nextItem = dishes.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items: dishes,
        nextCursor,
      };
    }),
});

