import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().url().refine(
    (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
    "DATABASE_URL must use PostgreSQL",
  ),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:4000"),
  BETTER_AUTH_SECRET: z.string().min(32).default("local-development-secret-change-before-production-32chars"),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  WEB_ORIGINS: z.string().default("http://localhost:5173").transform((value) =>
    value.split(",").map((origin) => origin.trim()).filter(Boolean),
  ),
});

const parsedConfig = configSchema.safeParse(process.env);

if (!parsedConfig.success) {
  const missingOrInvalid = parsedConfig.error.issues.map((issue) => {
    const key = issue.path.join(".") || "environment";
    return `  - ${key}: ${issue.message}`;
  });

  throw new Error(
    [
      "Backend configuration is incomplete.",
      "From the backend directory, run npm run dev to create a local .env, or configure the required values in your environment.",
      "Required configuration problems:",
      ...missingOrInvalid,
    ].join("\n"),
  );
}

export const config = parsedConfig.data;
if (config.NODE_ENV === "production" && config.BETTER_AUTH_SECRET.includes("local-development")) {
  throw new Error("Set BETTER_AUTH_SECRET to a unique random value before running in production.");
}
export const hasObjectStorage = Boolean(config.S3_BUCKET && config.S3_ACCESS_KEY_ID && config.S3_SECRET_ACCESS_KEY);
