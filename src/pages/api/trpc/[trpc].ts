import type { NextApiRequest, NextApiResponse } from "next";
import { createNextApiHandler } from "@trpc/server/adapters/next";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { env } from "~/env.mjs";

const handler = createNextApiHandler({
  router: appRouter,
  createContext: async (opts) => {
    return createTRPCContext(opts);
  },
  responseMeta({ type, errors }) {
    // Handle CORS
    const headers: Record<string, string> = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json",
    };

    return { headers };
  },
  onError:
    env.NODE_ENV === "development"
      ? ({ path, error, input }) => {
          console.error(
            `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
          );
          console.error("Error code:", error.code);
          console.error("Input received:", input);
          if (error.cause) {
            console.error("Error cause:", error.cause);
          }
        }
      : ({ path, error }) => {
          // Log errors in production too, but less verbose
          console.error(
            `tRPC error on ${path ?? "<no-path>"}: ${error.message}`
          );
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

  // Handle OPTIONS preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Delegate to tRPC handler - it will handle all error cases and return proper JSON
  return handler(req, res);
}
