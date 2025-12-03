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
      : undefined,
});

export default async function apiHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Enable CORS for Vercel
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle OPTIONS request for CORS preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Let tRPC handle the request - it already handles method checking internally
  return handler(req, res);
}


