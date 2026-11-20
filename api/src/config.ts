import { z } from "zod";

/** Treat "" like "not set", so a blank line in .env falls back to the default. */
const blank = (value: unknown) => (value === "" ? undefined : value);
const withDefault = <T extends z.ZodType>(schema: T) => z.preprocess(blank, schema);

const envSchema = z.object({
  PORT: withDefault(z.coerce.number().int().positive().default(4000)),

  PRODUCT_SOURCE: withDefault(z.enum(["fakestore", "fixture"]).default("fakestore")),
  FAKESTORE_BASE_URL: withDefault(z.url().default("https://fakestoreapi.com")),
  PRODUCT_CACHE_TTL_SECONDS: withDefault(z.coerce.number().int().min(0).default(300)),

  MONGODB_URI: withDefault(z.string().min(1).default("mongodb://localhost:27017")),
  MONGODB_DB: withDefault(z.string().min(1).default("catalogue")),

  EMAIL_PROVIDER: withDefault(z.enum(["smtp", "console"]).default("smtp")),
  SMTP_HOST: withDefault(z.string().min(1).default("localhost")),
  SMTP_PORT: withDefault(z.coerce.number().int().positive().default(1025)),
  SMTP_USER: withDefault(z.string().optional()),
  SMTP_PASS: withDefault(z.string().optional()),
  MAIL_FROM: withDefault(z.email().default("catalogue@example.test")),
  SALES_INBOX: withDefault(z.email().default("sales@example.test")),
  /** Where customers reach the site, for links in the sales email. */
  PUBLIC_WEB_URL: withDefault(z.url().default("http://localhost:3000")),
});

export type Config = z.infer<typeof envSchema>;

/** Fails fast at startup with every problem listed, instead of at first use. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid configuration:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
