import 'dotenv/config';
import { z } from 'zod';

const DEV_SECRET = 'dev-only-secret-change-me-please';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGO_URI: z.string().min(1).default('mongodb://localhost:27017/tdc_matchmaker'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters').default(DEV_SECRET),
  JWT_EXPIRES_IN: z.string().default('8h'),
  // Comma separated list of allowed browser origins.
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:8080'),
  // AI is optional: with no key the app transparently falls back to rule-based output.
  OPENAI_API_KEY: z.string().default(''),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  // Seed demo data on boot when the database is empty (handy for docker compose).
  AUTO_SEED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast: a mis-configured server should never start half-working.
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) console.error(` - ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}

if (parsed.data.NODE_ENV === 'production' && parsed.data.JWT_SECRET === DEV_SECRET) {
  console.error('JWT_SECRET must be set to a strong, unique value in production.');
  process.exit(1);
}

export const env = Object.freeze({
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
  corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
});
