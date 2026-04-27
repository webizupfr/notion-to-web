#!/usr/bin/env node
/**
 * Promotes a user to admin role.
 *
 * Usage :
 *   npm run admin:promote -- <email>
 *
 * Prérequis : DATABASE_URL dans .env.local, user doit déjà exister
 * (s'être connecté au moins une fois via magic link).
 *
 * Sans argument, liste tous les users + leur role.
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set. Add it to .env.local.');
    process.exit(1);
  }

  const db = drizzle(neon(url), { schema });
  const email = process.argv[2]?.trim();

  if (!email) {
    // List mode
    const all = await db.select().from(schema.users).orderBy(schema.users.createdAt);
    console.log(`${all.length} user(s) in DB:\n`);
    for (const u of all) {
      const rolePad = (u.role ?? 'learner').padEnd(8);
      console.log(`  [${rolePad}] ${u.email}    (id=${u.id.slice(0, 8)}... created=${u.createdAt.toISOString().slice(0, 10)})`);
    }
    console.log(`\nTo promote: npm run admin:promote -- email@example.com`);
    return;
  }

  // Promote mode
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (!user) {
    console.error(`User "${email}" not found. Have they logged in at least once?`);
    console.error(`Run without args to see all users.`);
    process.exit(1);
  }

  if (user.role === 'admin') {
    console.log(`${email} is already admin. Nothing to do.`);
    return;
  }

  await db.update(schema.users).set({ role: 'admin' }).where(eq(schema.users.id, user.id));
  console.log(`OK — ${email} is now admin.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
