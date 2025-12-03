import { createTRPCRouter } from "~/server/api/trpc";
import { authRouter } from "~/server/api/routers/auth";
import { restaurantRouter } from "~/server/api/routers/restaurant";
import { categoryRouter } from "~/server/api/routers/category";
import { dishRouter } from "~/server/api/routers/dish";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  restaurant: restaurantRouter,
  category: categoryRouter,
  dish: dishRouter,
});

export type AppRouter = typeof appRouter;

