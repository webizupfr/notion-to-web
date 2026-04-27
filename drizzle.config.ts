import { config as loadEnv } from 'dotenv';
import type { Config } from 'drizzle-kit';

// Drizzle-kit ne charge pas .env.local automatiquement → on le fait ici.
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is missing. Add it to .env.local (get the connection string from https://console.neon.tech).',
  );
}

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} satisfies Config;
