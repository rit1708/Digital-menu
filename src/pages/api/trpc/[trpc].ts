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
    };

    // Handle OPTIONS preflight
    if (type === "query" || type === "mutation") {
      return { headers };
    }

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
      : undefined,
});

// Handle OPTIONS preflight requests
export default async function apiHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.status(200).end();
    return;
  }

  return handler(req, res);
}
