import 'server-only';

import { kv } from '@vercel/kv';

import type { ProgramMeta, ProgramTree } from '@/lib/types';

/**
 * Couche KV pour les programmes v3.
 *
 * Architecture :
 *  - `program:v3:{slug}`      → ProgramTree complet (meta + bodyBlocks + units + stepBodies)
 *  - `programs:all:v3`        → Liste de tous les ProgramMeta (inclut drafts, unlisted, private)
 *  - `programs:sync:lastAt`   → ISO string du dernier sync global
 *
 * Le listing public filtre côté lecture (listPrograms filtre par visibility + publishingStatus).
 * Pas de TTL automatique — invalidation uniquement sur sync manuel ou cron daily.
 *
 * Fallback : si `hasKv()` retourne false (dev sans Upstash configuré), toutes les
 * fonctions renvoient null silencieusement. Le code appelant retombe alors sur
 * un fetch Notion direct.
 */

function hasKv(): boolean {
  return Boolean(process.env.KV_REST_API_URL || process.env.KV_URL);
}

const TREE_PREFIX = 'program:v3:';
const INDEX_KEY = 'programs:all:v3';
const LAST_SYNC_KEY = 'programs:sync:lastAt';
const LAST_SYNC_PER_KEY_PREFIX = 'programs:sync:lastAt:';

function treeKey(slug: string): string {
  return `${TREE_PREFIX}${slug}`;
}

function perProgramLastSyncKey(slug: string): string {
  return `${LAST_SYNC_PER_KEY_PREFIX}${slug}`;
}

// ─── Program tree ───

export async function getProgramTreeFromKV(slug: string): Promise<ProgramTree | null> {
  if (!hasKv() || !slug) return null;
  try {
    return (await kv.get<ProgramTree>(treeKey(slug))) ?? null;
  } catch (error) {
    console.error('[programs-kv] getProgramTreeFromKV failed', { slug, error });
    return null;
  }
}

export async function setProgramTreeInKV(slug: string, tree: ProgramTree): Promise<void> {
  if (!hasKv() || !slug) return;
  try {
    await kv.set(treeKey(slug), tree);
    await kv.set(perProgramLastSyncKey(slug), new Date().toISOString());
  } catch (error) {
    console.error('[programs-kv] setProgramTreeInKV failed', { slug, error });
  }
}

export async function deleteProgramTreeFromKV(slug: string): Promise<void> {
  if (!hasKv() || !slug) return;
  try {
    await kv.del(treeKey(slug));
  } catch (error) {
    console.error('[programs-kv] deleteProgramTreeFromKV failed', { slug, error });
  }
}

// ─── Programs index (all metas, filtré côté lecture) ───

export async function getProgramsIndexFromKV(): Promise<ProgramMeta[] | null> {
  if (!hasKv()) return null;
  try {
    return (await kv.get<ProgramMeta[]>(INDEX_KEY)) ?? null;
  } catch (error) {
    console.error('[programs-kv] getProgramsIndexFromKV failed', error);
    return null;
  }
}

export async function setProgramsIndexInKV(metas: ProgramMeta[]): Promise<void> {
  if (!hasKv()) return;
  try {
    await kv.set(INDEX_KEY, metas);
  } catch (error) {
    console.error('[programs-kv] setProgramsIndexInKV failed', error);
  }
}

// ─── Timestamps ───

/** Retourne l'ISO du dernier sync global, ou null si jamais sync. */
export async function getLastSyncAt(): Promise<string | null> {
  if (!hasKv()) return null;
  try {
    return (await kv.get<string>(LAST_SYNC_KEY)) ?? null;
  } catch (error) {
    console.error('[programs-kv] getLastSyncAt failed', error);
    return null;
  }
}

export async function setLastSyncAt(iso: string): Promise<void> {
  if (!hasKv()) return;
  try {
    await kv.set(LAST_SYNC_KEY, iso);
  } catch (error) {
    console.error('[programs-kv] setLastSyncAt failed', error);
  }
}

/** Retourne l'ISO du dernier sync d'UN programme (ou null si jamais sync). */
export async function getLastSyncAtForProgram(slug: string): Promise<string | null> {
  if (!hasKv() || !slug) return null;
  try {
    return (await kv.get<string>(perProgramLastSyncKey(slug))) ?? null;
  } catch (error) {
    console.error('[programs-kv] getLastSyncAtForProgram failed', { slug, error });
    return null;
  }
}

/** Retourne { syncedAt: ISO | null } pour chaque slug. Une seule call batch. */
export async function getLastSyncMapForSlugs(
  slugs: string[],
): Promise<Record<string, string | null>> {
  if (!hasKv() || slugs.length === 0) return {};
  try {
    const keys = slugs.map(perProgramLastSyncKey);
    const values = (await kv.mget<(string | null)[]>(...keys)) ?? [];
    const out: Record<string, string | null> = {};
    slugs.forEach((slug, i) => {
      out[slug] = values[i] ?? null;
    });
    return out;
  } catch (error) {
    console.error('[programs-kv] getLastSyncMapForSlugs failed', error);
    return {};
  }
}
