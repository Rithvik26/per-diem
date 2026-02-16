import { z } from 'zod';

/**
 * Zod schema that validates all required environment variables.
 * Defaults are applied where sensible; missing required vars
 * cause a hard failure at startup with descriptive messages.
 */
const envSchema = z.object({
  // Square
  SQUARE_ACCESS_TOKEN: z.string().min(1, 'SQUARE_ACCESS_TOKEN is required'),
  SQUARE_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),

  // Server
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Cache
  CACHE_PROVIDER: z.enum(['memory', 'redis']).default('memory'),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),

  // Redis — required only when CACHE_PROVIDER is 'redis'
  REDIS_URL: z.string().optional(),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(50),

  // Square webhook
  SQUARE_WEBHOOK_SIGNATURE_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Loads environment variables, validates them against the schema,
 * and derives additional config values (e.g. Square base URL).
 * Throws at startup if validation fails — fail fast.
 */
function loadConfig(): EnvConfig & { SQUARE_BASE_URL: string } {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    console.error(`[config] Invalid environment variables:\n${formatted}`);
    process.exit(1);
  }

  const env = result.data;

  // Redis URL is required when using redis cache provider
  if (env.CACHE_PROVIDER === 'redis' && !env.REDIS_URL) {
    console.error('[config] REDIS_URL is required when CACHE_PROVIDER=redis');
    process.exit(1);
  }

  const SQUARE_BASE_URL =
    env.SQUARE_ENVIRONMENT === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';

  return { ...env, SQUARE_BASE_URL };
}

/** Validated, typed application configuration. */
export const config = loadConfig();
