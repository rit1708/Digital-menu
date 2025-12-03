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

  // Only allow GET and POST methods
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // Handle POST requests (mutations) - wrap body for superjson
    if (req.method === "POST" && req.body && typeof req.body === "object") {
      if (!Array.isArray(req.body) && !("json" in req.body) && !("0" in req.body)) {
        req.body = { json: req.body };
      }
    }

    // Handle batch GET requests with superjson - transform input format
    if (req.method === "GET" && req.query.batch === "1" && req.query.input) {
      try {
        const inputStr = Array.isArray(req.query.input) 
          ? req.query.input[0] 
          : req.query.input;
        
        if (typeof inputStr === "string") {
          let parsedInput: Record<string, unknown>;
          try {
            parsedInput = JSON.parse(inputStr);
          } catch {
            return handler(req, res);
          }
          
          // Transform batch input format for superjson
          // tRPC batch format: {"0": {...}, "1": {...}}
          // Superjson expects: {"0": {"json": {...}}, "1": {"json": {...}}}
          const transformedInput: Record<string, { json: unknown }> = {};
          for (const [key, value] of Object.entries(parsedInput)) {
            if (typeof value === "object" && value !== null && !("json" in value)) {
              transformedInput[key] = { json: value };
            } else {
              transformedInput[key] = value as { json: unknown };
            }
          }
          
          // Update the request query and URL with transformed input
          const transformedInputStr = JSON.stringify(transformedInput);
          req.query.input = transformedInputStr;
          if (req.url) {
            req.url = req.url.replace(
              /input=[^&]*/,
              `input=${encodeURIComponent(transformedInputStr)}`
            );
          }
        }
      } catch (error) {
        if (env.NODE_ENV === "development") {
          console.error("Error transforming batch input:", error);
        }
      }
    }

    return handler(req, res);
  } catch (error) {
    console.error("API handler error:", error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
}


