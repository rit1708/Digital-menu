import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { randomBytes } from "crypto";
import { sendVerificationCodeEmail } from "~/lib/send-email";
import { env } from "~/env.mjs";

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateSessionToken = () => {
  return randomBytes(32).toString("hex");
};

export const authRouter = createTRPCRouter({
  sendVerificationCode: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const code = generateVerificationCode();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Code expires in 10 minutes

      await ctx.db.verificationCode.create({
        data: {
          email: input.email,
          code,
          expiresAt,
        },
      });

      const sendVerificationCode = env.SEND_VERIFICATION_CODE ?? false;
      const result = await sendVerificationCodeEmail(input.email, code, sendVerificationCode)
      if (result.success) {
        return { success: true, message: result.message, code: result.code };
      } else {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send verification code",
        });
      }
    }),

  verifyAndRegister: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        code: z.string().length(6),
        name: z.string().min(1),
        country: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const verificationCode = await ctx.db.verificationCode.findFirst({
        where: {
          email: input.email,
          code: input.code,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!verificationCode) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired verification code",
        });
      }

      // Check if user exists
      let user = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (user) {
        // Update user info
        user = await ctx.db.user.update({
          where: { email: input.email },
          data: {
            name: input.name,
            country: input.country,
          },
        });
      } else {
        // Create new user
        user = await ctx.db.user.create({
          data: {
            email: input.email,
            name: input.name,
            country: input.country,
          },
        });
      }

      // Create session
      const token = generateSessionToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Session expires in 30 days

      await ctx.db.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      // Delete used verification code
      await ctx.db.verificationCode.delete({
        where: { id: verificationCode.id },
      });

      return { token, user };
    }),

  verifyAndLogin: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        code: z.string().length(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const verificationCode = await ctx.db.verificationCode.findFirst({
        where: {
          email: input.email,
          code: input.code,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!verificationCode) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired verification code",
        });
      }

      let user = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      // Auto-create user if they don't exist (using email-based defaults)
      if (!user) {
        const emailName = input.email.split("@")[0];
        const capitalizedName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        user = await ctx.db.user.create({
          data: {
            email: input.email,
            name: capitalizedName,
            country: "Unknown",
          },
        });
      }

      // Create session
      const token = generateSessionToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await ctx.db.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      // Delete used verification code
      await ctx.db.verificationCode.delete({
        where: { id: verificationCode.id },
      });

      return { token, user };
    }),

  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.userId },
      select: {
        id: true,
        email: true,
        name: true,
        country: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user;
  }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    // Extract token from headers (handle both cases)
    const authHeader = ctx.req.headers?.authorization || 
                      ctx.req.headers?.["Authorization"] ||
                      (ctx.req.headers as Record<string, string | string[] | undefined>)?.authorization;
    
    const token = typeof authHeader === "string" 
      ? authHeader.replace(/^Bearer\s+/i, "").trim() 
      : null;
    
    if (token && token !== "undefined") {
      await ctx.db.session.deleteMany({
        where: { token },
      });
    }
    return { success: true };
  }),
});

