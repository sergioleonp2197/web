import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  FRONTEND_ORIGIN: z.string().default("http://localhost:4200"),
  JWT_SECRET: z.string().min(16).default("change-this-secret-key-please"),
  TRUST_PROXY: z.string().optional(),
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).optional(),
  API_RATE_LIMIT_MAX: z.coerce.number().int().min(1).optional(),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).optional(),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).optional(),
  DB_DIALECT: z.enum(["sqlite", "postgres"]).default("sqlite"),
  SQLITE_STORAGE: z.string().default("./data/medium.sqlite"),
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().default("medium_clone"),
  DB_USER: z.string().default("postgres"),
  DB_PASS: z.string().default("postgres"),
  DB_LOGGING: z.string().optional(),
  DB_SYNC_ALTER: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.format());
  throw new Error("Invalid environment variables");
}

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return value.trim().toLowerCase() === "true";
};

export const env = {
  ...parsed.data,
  DB_LOGGING: toBoolean(parsed.data.DB_LOGGING, false),
  DB_SYNC_ALTER: toBoolean(parsed.data.DB_SYNC_ALTER, true),
  TRUST_PROXY: toBoolean(parsed.data.TRUST_PROXY, false),
  API_RATE_LIMIT_WINDOW_MS: parsed.data.API_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000,
  API_RATE_LIMIT_MAX: parsed.data.API_RATE_LIMIT_MAX ?? 500,
  AUTH_RATE_LIMIT_WINDOW_MS: parsed.data.AUTH_RATE_LIMIT_WINDOW_MS ?? 10 * 60 * 1000,
  AUTH_RATE_LIMIT_MAX: parsed.data.AUTH_RATE_LIMIT_MAX ?? 50
};

export type Env = typeof env;
