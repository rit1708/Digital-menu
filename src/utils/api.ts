import { httpBatchLink, httpLink, splitLink } from "@trpc/client";
import { createTRPCNext } from "@trpc/next";
import superjson from "superjson";
import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "~/server/api/root";

export type RouterOutputs = inferRouterOutputs<AppRouter>;

const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url
  return `http://localhost:${process.env.PORT ?? 3000}`; // dev SSR should use localhost
};

const getHeaders = () => {
  if (typeof window === "undefined") {
    return {};
  }
  
  const token = localStorage.getItem("auth-token");
  
  if (!token || 
      token === "undefined" || 
      token === "null" || 
      token.trim() === "") {
    if (token) {
      localStorage.removeItem("auth-token");
    }
    return {};
  }
  
  return {
    authorization: `Bearer ${token}`,
  };
};

export const api = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        splitLink({
          condition: (op) => op.type === "mutation",
          true: httpLink({
            url: `${getBaseUrl()}/api/trpc`,
            headers: getHeaders,
            transformer: superjson,
          }),
          false: httpBatchLink({
            url: `${getBaseUrl()}/api/trpc`,
            headers: getHeaders,
            transformer: superjson,
          }),
        }),
      ],
      queryClientConfig: {
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      },
    };
  },
  ssr: false,
  transformer: superjson,
});

