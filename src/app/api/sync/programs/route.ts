import 'server-only';

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import {
  listAllProgramsFromNotion,
  buildProgramTreeFromNotion,
} from '@/lib/programs';
import {
  setProgramsIndexInKV,
  setProgramTreeInKV,
  setLastSyncAt,
} from '@/lib/programs-kv';

/**
 * Sync global des programmes v3 : Notion → KV.
 *
 *   GET  ?secret=CRON_SECRET  → appelé par le cron Vercel (daily 6h UTC)
 *   POST (session admin)      → appelé par le bouton "Synchroniser" dans /admin
 *
 * Le process :
 *   1. Fetch tous les ProgramMeta depuis Notion (DB Programs)
 *   2. Pour chaque program : buildProgramTreeFromNotion → setProgramTreeInKV
 *   3. Met à jour l'index global + le timestamp
 *   4. revalidatePath('/programs') pour que ISR pique le nouveau KV
 *
 * Limite Vercel : 300s (maxDuration).
 */

export const runtime = 'nodejs';
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;

type SyncResult = {
  ok: boolean;
  programsTotal: number;
  programsSynced: number;
  programsSkipped: number;
  errors: Array<{ slug: string; error: string }>;
  durationMs: number;
  syncedAt: string;
};

async function runSyncAll(): Promise<SyncResult> {
  const startedAt = Date.now();
  const metas = await listAllProgramsFromNotion();

  let synced = 0;
  let skipped = 0;
  const errors: Array<{ slug: string; error: string }> = [];

  // Sync séquentiel (évite les rate limits Notion)
  for (const meta of metas) {
    try {
      const tree = await buildProgramTreeFromNotion(meta.slug);
      if (!tree) {
        skipped += 1;
        continue;
      }
      await setProgramTreeInKV(meta.slug, tree);
      synced += 1;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[sync programs] failed for', meta.slug, msg);
      errors.push({ slug: meta.slug, error: msg });
    }
  }

  // Index global + timestamp
  await setProgramsIndexInKV(metas);
  const syncedAt = new Date().toISOString();
  await setLastSyncAt(syncedAt);

  // Invalide ISR pour que /programs et /programs/[slug] re-render avec le nouveau KV
  try {
    revalidatePath('/programs');
    revalidatePath('/programs/[slug]', 'page');
  } catch {
    // revalidatePath peut fail en contexte cron, on ignore
  }

  return {
    ok: errors.length === 0,
    programsTotal: metas.length,
    programsSynced: synced,
    programsSkipped: skipped,
    errors,
    durationMs: Date.now() - startedAt,
    syncedAt,
  };
}

// ─── Handlers ───

function isAuthorizedCron(request: Request): boolean {
  if (!CRON_SECRET) return false;
  // 1. Authorization: Bearer CRON_SECRET (Vercel Cron default)
  const authHeader = request.headers.get('authorization') ?? '';
  if (authHeader === `Bearer ${CRON_SECRET}`) return true;
  // 2. ?secret=... (manual curl / backward compat)
  const secret = new URL(request.url).searchParams.get('secret');
  if (secret === CRON_SECRET) return true;
  return false;
}

export async function GET(request: Request) {
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET missing on server' }, { status: 500 });
  }
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runSyncAll();
    return NextResponse.json(result, { status: result.ok ? 200 : 207 });
  } catch (error) {
    console.error('[sync programs] fatal', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function POST() {
  // Manual trigger depuis admin — auth user
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const result = await runSyncAll();
    return NextResponse.json(result, { status: result.ok ? 200 : 207 });
  } catch (error) {
    console.error('[sync programs] fatal (manual)', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
