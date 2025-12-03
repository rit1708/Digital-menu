import { z } from "zod";

const server = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  RESEND_ACCOUNT_EMAIL: z.string().email().optional(),
  SEND_VERIFICATION_CODE: z.boolean().default(false),
});

const client = z.object({});

const processEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  RESEND_ACCOUNT_EMAIL: process.env.RESEND_ACCOUNT_EMAIL,
};

function getEnv() {
  const _server = server.safeParse(processEnv);

  if (!_server.success) {
    console.error("❌ Invalid environment variables:", _server.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }

  const _client = client.safeParse(processEnv);

  if (!_client.success) {
    console.error("❌ Invalid client environment variables:", _client.error.flatten().fieldErrors);
    throw new Error("Invalid client environment variables");
  }

  return {
    ..._server.data,
    ..._client.data,
  };
}

export const env = getEnv();

