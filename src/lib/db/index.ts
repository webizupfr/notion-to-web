import 'server-only';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const url = process.env.DATABASE_URL;

if (!url) {
  console.warn(
    '[db] DATABASE_URL not set — LMS features (auth, progress) sont désactivées. Le reste du site marche normalement.',
  );
}

/**
 * Client Drizzle. Si DATABASE_URL n'est pas configuré, les appels DB lèvent
 * une erreur contrôlée plutôt que de planter à l'import.
 */
export const db = url
  ? drizzle(neon(url), { schema })
  : (new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
      get() {
        throw new Error(
          '[db] DATABASE_URL not configured — cannot execute query. Set DATABASE_URL in .env.local.',
        );
      },
    }) as ReturnType<typeof drizzle<typeof schema>>);

export { schema };
export * from './schema';
