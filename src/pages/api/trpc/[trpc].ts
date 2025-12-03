import type { NextApiRequest, NextApiResponse } from "next";
import { createNextApiHandler } from "@trpc/server/adapters/next";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { env } from "~/env.mjs";

const handler = createNextApiHandler({
  router: appRouter,
  createContext: async (opts) => {
    try {
      return await createTRPCContext(opts);
    } catch (error) {
      console.error("Error creating tRPC context:", error);
      // Import db here to ensure it's available even if context creation fails
      const { db } = await import("~/server/db");
      // Return a valid context with db - operations will fail with proper tRPC errors
      return {
        db,
        userId: null,
        req: opts.req,
      };
    }
  },
  responseMeta() {
    // Handle CORS
    const headers: Record<string, string> = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json",
    };

    return { headers };
  },
  onError: ({ path, error, input, type }) => {
    // Always log errors
    console.error(
      `❌ tRPC ${type} failed on ${path ?? "<no-path>"}: ${error.message}`
    );
    if (env.NODE_ENV === "development") {
      console.error("Error code:", error.code);
      console.error("Input received:", input);
      if (error.cause) {
        console.error("Error cause:", error.cause);
      }
      if (error.stack) {
        console.error("Stack trace:", error.stack);
      }
    }
  },
});

// Handle OPTIONS preflight requests and ensure proper error handling
export default async function apiHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers for all requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");

  // Handle OPTIONS preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Wrap handler in try-catch to ensure we always return JSON
  try {
    return await handler(req, res);
  } catch (error) {
    console.error("Unhandled error in tRPC handler:", error);

    // Only send error response if headers haven't been sent
    if (!res.headersSent) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorResponse = {
        error: {
          message: errorMessage,
          code: "INTERNAL_SERVER_ERROR",
          data: {
            code: "INTERNAL_SERVER_ERROR",
            httpStatus: 500,
          },
        },
      };

      res.status(500).json(errorResponse);
    }
  }
}
