import 'server-only';

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { buildProgramTreeFromNotion, listAllProgramsFromNotion } from '@/lib/programs';
import { setProgramTreeInKV, setProgramsIndexInKV } from '@/lib/programs-kv';

/**
 * Sync ciblé d'UN programme : Notion → KV.
 *
 *   POST (session admin)  → appelé par le bouton "Resync" sur chaque ligne de /admin/programs
 *
 * Rebuild aussi l'index global (pour que la page publique /programs voie aussi les
 * metas à jour — ex: title ou thumbnail changés).
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  const startedAt = Date.now();
  try {
    const tree = await buildProgramTreeFromNotion(slug);
    if (!tree) {
      return NextResponse.json({ ok: false, error: 'Program not found', slug }, { status: 404 });
    }
    await setProgramTreeInKV(slug, tree);

    // Rebuild index global aussi (meta peut avoir changé)
    const metas = await listAllProgramsFromNotion();
    await setProgramsIndexInKV(metas);

    try {
      revalidatePath(`/programs/${slug}`);
      revalidatePath('/programs');
    } catch {
      // ignore
    }

    return NextResponse.json({
      ok: true,
      slug,
      durationMs: Date.now() - startedAt,
      syncedAt: new Date().toISOString(),
      unitsCount: tree.units.length,
      stepsCount: tree.units.reduce((acc, u) => acc + u.steps.length, 0),
    });
  } catch (error) {
    console.error(`[sync programs/${slug}] fatal`, error);
    return NextResponse.json(
      {
        ok: false,
        slug,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
