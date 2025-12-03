import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateNextContextOptions } from "@trpc/server/adapters/next";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "~/server/db";

export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  // Next.js normalizes headers to lowercase, but handle both cases for robustness
  const authHeader = opts.req.headers.authorization || 
                     opts.req.headers["Authorization"] ||
                     (opts.req.headers as Record<string, string | string[] | undefined>).authorization;
  
  const token = typeof authHeader === "string" 
    ? authHeader.replace(/^Bearer\s+/i, "").trim() 
    : null;

  let userId: string | null = null;
  if (token && token !== "undefined") {
    const session = await db.session.findUnique({
      where: { token },
      select: { userId: true, expiresAt: true },
    });

    if (session && session.expiresAt > new Date()) {
      userId = session.userId;
    }
  }

  return {
    db,
    userId,
    req: opts.req,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthenticated);

