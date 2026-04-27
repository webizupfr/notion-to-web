#!/usr/bin/env node
/**
 * Health check — vérifie que toute la config nécessaire est en place.
 *
 * Vérifie :
 *   - Env vars obligatoires présentes
 *   - Connexion Notion (appel /users/me)
 *   - Accès aux DBs Notion configurées
 *   - Connexion Neon Postgres (SELECT 1)
 *   - Accès Upstash KV (PING)
 *   - Clé Resend valide (appelle /domains)
 *
 * Usage :
 *   npm run health
 *
 * Exit code 0 si tout passe, 1 si au moins un check échoue.
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

type CheckResult = { name: string; ok: boolean; warn?: boolean; detail?: string };

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function ok(name: string, detail?: string): CheckResult {
  return { name, ok: true, detail };
}
function fail(name: string, detail: string): CheckResult {
  return { name, ok: false, detail };
}
function warn(name: string, detail: string): CheckResult {
  return { name, ok: true, warn: true, detail };
}

async function checkEnv(): Promise<CheckResult[]> {
  const required = [
    'DATABASE_URL',
    'AUTH_SECRET',
    'AUTH_RESEND_KEY',
    'AUTH_RESEND_FROM',
    'NOTION_TOKEN',
    'NOTION_PROGRAMS_DB',
    'CRON_SECRET',
  ];
  const optional = [
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
    'NOTION_INSTRUCTORS_DB',
    'NOTION_PAGES_DB',
    'NOTION_POSTS_DB',
    'NEXTAUTH_URL',
    'NEXT_PUBLIC_SITE_URL',
    'CLOUDINARY_CLOUD_NAME',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ];

  const results: CheckResult[] = [];
  for (const key of required) {
    if (process.env[key]) {
      results.push(ok(`env: ${key}`));
    } else {
      results.push(fail(`env: ${key}`, 'manquante (obligatoire)'));
    }
  }
  for (const key of optional) {
    if (process.env[key]) {
      results.push(ok(`env: ${key}`, '(optionnelle)'));
    }
  }
  return results;
}

async function checkNotion(): Promise<CheckResult[]> {
  const token = process.env.NOTION_TOKEN;
  if (!token) return [fail('Notion: token', 'NOTION_TOKEN manquant')];

  const results: CheckResult[] = [];

  // 1. /users/me
  try {
    const r = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
      },
    });
    if (!r.ok) {
      const body = await r.text();
      results.push(fail('Notion: /users/me', `${r.status} — ${body.slice(0, 120)}`));
      return results;
    }
    const data = (await r.json()) as { name?: string; bot?: { workspace_name?: string } };
    results.push(
      ok('Notion: /users/me', `bot=${data.name ?? '?'} · workspace=${data.bot?.workspace_name ?? '?'}`),
    );
  } catch (e) {
    results.push(fail('Notion: /users/me', e instanceof Error ? e.message : String(e)));
    return results;
  }

  // 2. Accès DB Programs
  const programsDb = process.env.NOTION_PROGRAMS_DB;
  if (programsDb) {
    try {
      const r = await fetch(`https://api.notion.com/v1/databases/${programsDb}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
        },
      });
      if (!r.ok) {
        const body = await r.text();
        results.push(
          fail('Notion: DB Programs', `${r.status} — ${body.slice(0, 120)}. L'intégration a-t-elle accès à la DB ?`),
        );
      } else {
        const data = (await r.json()) as { title?: Array<{ plain_text?: string }>; properties?: Record<string, unknown> };
        const title = data.title?.[0]?.plain_text ?? 'DB Programs';
        const propCount = Object.keys(data.properties ?? {}).length;
        results.push(ok('Notion: DB Programs', `"${title}" · ${propCount} propriétés`));
      }
    } catch (e) {
      results.push(fail('Notion: DB Programs', e instanceof Error ? e.message : String(e)));
    }
  }

  return results;
}

async function checkDatabase(): Promise<CheckResult[]> {
  const url = process.env.DATABASE_URL;
  if (!url) return [fail('DB: DATABASE_URL', 'manquant')];

  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);
    const result = (await sql`SELECT 1 AS ok`) as Array<{ ok: number }>;
    if (result[0]?.ok === 1) {
      // Check tables
      const tables = (await sql`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `) as Array<{ table_name: string }>;
      const names = tables.map((t) => t.table_name);
      const hasUsers = names.includes('user');
      const hasEnrollments = names.includes('enrollment');
      if (hasUsers && hasEnrollments) {
        return [ok('DB: Neon Postgres', `${names.length} tables · ${names.slice(0, 3).join(', ')}...`)];
      }
      return [
        fail(
          'DB: schema',
          `Tables manquantes. Tables trouvées : ${names.join(', ') || '(aucune)'}. Lance \`npm run db:push\`.`,
        ),
      ];
    }
    return [fail('DB: SELECT 1', 'Réponse inattendue')];
  } catch (e) {
    return [fail('DB: Neon Postgres', e instanceof Error ? e.message : String(e))];
  }
}

async function checkKV(): Promise<CheckResult[]> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    return [ok('KV: Upstash', '(pas configuré — optionnel, fallback Notion direct)')];
  }

  try {
    const r = await fetch(`${url}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      return [fail('KV: Upstash ping', `${r.status}`)];
    }
    return [ok('KV: Upstash', 'ping OK')];
  } catch (e) {
    return [fail('KV: Upstash', e instanceof Error ? e.message : String(e))];
  }
}

async function checkResend(): Promise<CheckResult[]> {
  const key = process.env.AUTH_RESEND_KEY;
  const from = process.env.AUTH_RESEND_FROM;
  if (!key) return [fail('Resend: key', 'AUTH_RESEND_KEY manquant')];

  try {
    const r = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (r.status === 401 || r.status === 403) {
      return [
        warn(
          'Resend: key',
          'Restricted API key (ne peut pas lister les domaines) — envoi d\'emails toujours possible',
        ),
      ];
    }
    if (!r.ok) return [fail('Resend: /domains', `${r.status}`)];

    const data = (await r.json()) as { data?: Array<{ name: string; status: string }> };
    const domains = data.data ?? [];
    if (!from) return [ok('Resend: key', 'OK (AUTH_RESEND_FROM non set)')];

    const fromDomain = from.includes('@') ? from.split('@')[1] : from;
    const match = domains.find((d) => d.name === fromDomain);
    if (!match) {
      return [
        ok('Resend: key', 'OK'),
        fail(
          'Resend: domaine',
          `Le domaine "${fromDomain}" n'est pas dans Resend. Ajoute-le dans le dashboard.`,
        ),
      ];
    }
    return [
      ok('Resend: key', 'OK'),
      match.status === 'verified'
        ? ok('Resend: domaine', `${fromDomain} vérifié`)
        : fail('Resend: domaine', `${fromDomain} — status=${match.status}`),
    ];
  } catch (e) {
    return [fail('Resend: API', e instanceof Error ? e.message : String(e))];
  }
}

function printCheck(r: CheckResult) {
  const icon = r.warn
    ? `${c.yellow}⚠${c.reset}`
    : r.ok
      ? `${c.green}✓${c.reset}`
      : `${c.red}✗${c.reset}`;
  const detail = r.detail ? ` ${c.dim}${r.detail}${c.reset}` : '';
  console.log(`  ${icon} ${r.name}${detail}`);
}

async function checkStripe(): Promise<CheckResult[]> {
  const key = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key) return [warn('Stripe: secret key', '(non configuré — paywall désactivé)')];

  try {
    const r = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!r.ok) {
      return [fail('Stripe: secret key', `${r.status} — clé invalide ?`)];
    }
    const out: CheckResult[] = [
      ok('Stripe: secret key', key.startsWith('sk_test_') ? 'mode TEST' : 'mode LIVE'),
    ];
    if (!webhookSecret) {
      out.push(
        warn(
          'Stripe: webhook secret',
          'STRIPE_WEBHOOK_SECRET manquant — webhooks ne pourront pas être validés',
        ),
      );
    } else {
      out.push(ok('Stripe: webhook secret', 'configuré'));
    }
    return out;
  } catch (e) {
    return [fail('Stripe: API', e instanceof Error ? e.message : String(e))];
  }
}

async function main() {
  console.log(`\n${c.bold}${c.cyan}Health check${c.reset}\n`);

  const sections: Array<{ title: string; checks: () => Promise<CheckResult[]> }> = [
    { title: 'Variables d’environnement', checks: checkEnv },
    { title: 'Database (Neon)', checks: checkDatabase },
    { title: 'Notion', checks: checkNotion },
    { title: 'KV (Upstash)', checks: checkKV },
    { title: 'Email (Resend)', checks: checkResend },
    { title: 'Paiements (Stripe)', checks: checkStripe },
  ];

  const allResults: CheckResult[] = [];
  for (const section of sections) {
    console.log(`${c.bold}${section.title}${c.reset}`);
    const results = await section.checks();
    for (const r of results) {
      printCheck(r);
      allResults.push(r);
    }
    console.log();
  }

  const failed = allResults.filter((r) => !r.ok);
  if (failed.length === 0) {
    console.log(`${c.green}${c.bold}✓ Tout est en place${c.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${c.red}${c.bold}✗ ${failed.length} check(s) en erreur${c.reset}`);
    console.log(`${c.dim}Voir ci-dessus pour les détails. Corrige les env vars dans .env.local puis relance.${c.reset}\n`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(c.red + 'Fatal:' + c.reset, e);
  process.exit(2);
});
