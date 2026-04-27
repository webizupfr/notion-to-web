import 'server-only';

import type {
  PageObjectResponse,
  BlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { notion, pageBlocksDeepCached } from '@/lib/notion';
import { cacheSet } from '@/lib/cache';
import { mirrorRemoteImage } from '@/lib/media';
import {
  isConfigCallout,
  isPinnedCallout,
  parsePinnedResources,
  parseUnitConfig,
  parseStepConfig,
} from '@/lib/program-config';
import {
  getProgramTreeFromKV,
  setProgramTreeInKV,
  getProgramsIndexFromKV,
  setProgramsIndexInKV,
} from '@/lib/programs-kv';
import type {
  ProgramMeta,
  UnitMeta,
  StepMeta,
  ProgramType,
  ProgramTree,
  ProgramTreeStep,
  ProgramTreeUnit,
} from '@/lib/types';

/**
 * Data layer Programs v3 — 1 DB Programs + child pages hiérarchiques.
 *
 *   DB Programs
 *     ├── row: "Challenge IA"
 *     │     └── body = intro + 📌 resources + child_pages (Units)
 *     │           ├── child_page "Jour 1"
 *     │           │    └── body = ⚙️ Config + intro + child_pages (Steps)
 *     │           │          ├── child_page "Accueil" → ⚙️ Config + contenu
 *     │           │          └── child_page "Exercice" → ⚙️ Config + contenu
 *     │           └── child_page "Jour 2"
 *     └── row: "Business Launch"
 *
 * Défauts intelligents appliqués quand le callout ⚙️ manque ou est incomplet.
 * Cf. docs/V3_NOTION_IDS.md pour la spec complète du callout.
 */

const PROGRAMS_DB = process.env.NOTION_PROGRAMS_DB;

// ─── Notion property helpers (inchangés) ───

type Prop = PageObjectResponse['properties'][string];
type AugmentedBlock = BlockObjectResponse & { __children?: BlockObjectResponse[] };

function rt(prop: Prop | undefined): string {
  if (!prop) return '';
  const arr = prop.type === 'title' ? prop.title : prop.type === 'rich_text' ? prop.rich_text : null;
  if (!arr) return '';
  return (arr as Array<{ plain_text?: string }>)
    .map((t) => t.plain_text ?? '')
    .join('')
    .trim();
}

function sel(prop: Prop | undefined): string | null {
  return prop?.type === 'select' ? prop.select?.name ?? null : null;
}

function num(prop: Prop | undefined): number | null {
  return prop?.type === 'number' && typeof prop.number === 'number' ? prop.number : null;
}

function cbx(prop: Prop | undefined): boolean | null {
  if (prop?.type !== 'checkbox') return null;
  return !!prop.checkbox;
}

function dateStart(prop: Prop | undefined): string | null {
  return prop?.type === 'date' ? prop.date?.start ?? null : null;
}

function relIds(prop: Prop | undefined): string[] {
  if (prop?.type !== 'relation') return [];
  return (prop.relation ?? []).map((r: { id: string }) => r.id).filter(Boolean);
}

function firstFileUrl(prop: Prop | undefined): string | null {
  if (prop?.type !== 'files') return null;
  const f = prop.files?.[0];
  if (!f) return null;
  if (f.type === 'external') return f.external?.url ?? null;
  if (f.type === 'file') return f.file?.url ?? null;
  return null;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Détecte si une URL est hostée chez Notion (S3 expirant après ~1h).
 * Si oui, on mirror vers Cloudinary pour avoir une URL stable.
 * Sinon (URL externe stable : Cloudinary, Unsplash, Imgur, etc.) on garde tel quel.
 */
function isNotionHostedUrl(url: string): boolean {
  return (
    url.includes('prod-files-secure.s3') ||
    url.includes('s3.us-west-2.amazonaws.com') ||
    url.includes('secure.notion-static.com') ||
    url.includes('notion-static.com')
  );
}

/**
 * Mirror une image Notion-hosted vers Cloudinary (idempotent via KV cache).
 * Si l'URL n'est pas Notion-hosted ou si Cloudinary n'est pas configuré, retourne
 * l'URL d'origine inchangée.
 */
async function mirrorIfNotionHosted(
  sourceUrl: string | null,
  targetKey: string,
): Promise<string | null> {
  if (!sourceUrl) return null;
  if (!isNotionHostedUrl(sourceUrl)) return sourceUrl;
  try {
    const result = await mirrorRemoteImage({ sourceUrl, targetKey });
    return result.url; // soit l'URL Cloudinary mirrored, soit fallback sourceUrl si échec
  } catch (e) {
    console.error('[programs] mirrorIfNotionHosted failed', { sourceUrl, e });
    return sourceUrl;
  }
}

// ─── Mapper : row DB Programs → ProgramMeta ───

function mapProgram(page: PageObjectResponse): ProgramMeta | null {
  const p = page.properties;
  const slug = rt(p.slug);
  if (!slug) return null;
  const title = rt(p.Title) || rt(p.Name) || slug;

  const typeRaw = sel(p.type) as ProgramType | null;
  const type: ProgramType =
    typeRaw === 'async' || typeRaw === 'sync' || typeRaw === 'event' ? typeRaw : 'async';

  const visRaw = sel(p.visibility);
  const visibility: 'public' | 'unlisted' | 'private' =
    visRaw === 'unlisted' ? 'unlisted' : visRaw === 'private' ? 'private' : 'public';

  const statusRaw = sel(p.publishing_status);
  const publishingStatus =
    statusRaw === 'draft' || statusRaw === 'published' || statusRaw === 'archived'
      ? statusRaw
      : null;

  // Paywall
  const priceRaw = num(p.price);
  const price = priceRaw && priceRaw > 0 ? priceRaw : null;
  const currency = sel(p.currency) || 'EUR';

  return {
    notionId: page.id,
    slug,
    title,
    type,
    description: rt(p.description) || null,
    visibility,
    password: rt(p.password) || null,
    lastEdited: page.last_edited_time,
    publishingStatus,
    coverImageUrl: firstFileUrl(p.cover_image),
    thumbnailUrl: firstFileUrl(p.thumbnail),
    instructorIds: relIds(p.instructors),
    startDatetime: dateStart(p.start_datetime),
    certificateEnabled: cbx(p.certificate_enabled),
    price,
    currency: price ? currency : null,
  };
}

// ─── Query helpers ───

async function queryAll(databaseId: string): Promise<PageObjectResponse[]> {
  const out: PageObjectResponse[] = [];
  let cursor: string | undefined;
  do {
    const r = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const p of r.results) {
      if ((p as { object: string }).object === 'page') out.push(p as PageObjectResponse);
    }
    cursor = r.has_more ? r.next_cursor ?? undefined : undefined;
  } while (cursor);
  return out;
}

// ─── Tree traversal (body blocks → units → steps) ───

/**
 * Trouve le PREMIER callout ⚙️ Config dans une liste de blocks.
 * Retourne le callout + la liste des blocks sans ce callout.
 */
function extractConfigCallout(
  blocks: AugmentedBlock[],
): { config: AugmentedBlock | null; rest: AugmentedBlock[] } {
  const idx = blocks.findIndex((b) => isConfigCallout(b));
  if (idx === -1) return { config: null, rest: blocks };
  const config = blocks[idx];
  const rest = [...blocks.slice(0, idx), ...blocks.slice(idx + 1)];
  return { config, rest };
}

/**
 * Sépare une liste de blocks en :
 *   - `childPages` : les child_page blocks (dans l'ordre d'apparition)
 *   - `bodyBlocks` : les autres blocs (hors callouts 📌 et hors child_pages)
 *   - `pinnedCallouts` : les callouts 📌 (pour extraction des resources)
 */
function partitionBlocks(blocks: AugmentedBlock[]): {
  childPages: AugmentedBlock[];
  bodyBlocks: AugmentedBlock[];
  pinnedCallouts: AugmentedBlock[];
} {
  const childPages: AugmentedBlock[] = [];
  const bodyBlocks: AugmentedBlock[] = [];
  const pinnedCallouts: AugmentedBlock[] = [];
  for (const b of blocks) {
    if (b.type === 'child_page') {
      childPages.push(b);
    } else if (isPinnedCallout(b)) {
      pinnedCallouts.push(b);
    } else {
      bodyBlocks.push(b);
    }
  }
  return { childPages, bodyBlocks, pinnedCallouts };
}

/** Extrait le titre d'un child_page block. */
function childPageTitle(block: AugmentedBlock): string {
  if (block.type !== 'child_page') return '';
  return block.child_page?.title?.trim() ?? '';
}

/**
 * Pré-peuple le cache `pageBlocksDeepCached` pour un child_page block.
 *
 * pageBlocksDeepCached(pageId) utilise la clé `page:{id}:{last_edited_time}`.
 * Comme on a déjà les blocs (via __children) depuis le walk du programme parent,
 * on les écrit directement en cache → évite un refetch quand ActivityContent
 * ouvre un step.
 */
function primeCacheFromChildPage(block: AugmentedBlock, ttlMs = 5 * 60 * 1000) {
  if (block.type !== 'child_page') return;
  const children = block.__children ?? [];
  const version = block.last_edited_time;
  if (!version) return;
  const key = `page:${block.id}:${version}`;
  cacheSet(key, children, ttlMs);
}

/** Construit un Step depuis un child_page block (tout en mémoire, 0 appel réseau). */
function buildStepFromBlock(
  stepBlock: AugmentedBlock,
  unitNotionId: string,
  order: number,
  isFirst: boolean,
  isLast: boolean,
): ProgramTreeStep | null {
  const title = childPageTitle(stepBlock);
  if (!title) return null;

  // Pré-peuple le cache Map in-memory (utile hors KV)
  primeCacheFromChildPage(stepBlock);

  const children = (stepBlock.__children ?? []) as AugmentedBlock[];
  const { config, rest } = extractConfigCallout(children);
  // Le body du step = children moins le callout ⚙️ (et les callouts 📌 au cas où)
  const bodyBlocks = rest.filter((b) => !isPinnedCallout(b));
  const cfg = parseStepConfig(config);

  const defaultType = isFirst ? 'intro' : isLast ? 'conclusion' : 'step';
  const type = cfg.type ?? defaultType;

  const meta: StepMeta = {
    notionId: stepBlock.id,
    slug: slugify(title),
    title,
    unitNotionId,
    order,
    type,
    durationMinutes: cfg.durationMinutes ?? null,
    requiresCheck: cfg.requiresCheck ?? false,
  };

  return { meta, bodyBlocks };
}

/** Construit une Unit depuis un child_page block (tout en mémoire, 0 appel réseau). */
function buildUnitFromBlock(
  unitBlock: AugmentedBlock,
  programNotionId: string,
  programSlug: string,
  order: number,
): ProgramTreeUnit | null {
  const title = childPageTitle(unitBlock);
  if (!title) return null;

  primeCacheFromChildPage(unitBlock);

  const children = (unitBlock.__children ?? []) as AugmentedBlock[];
  const { config, rest } = extractConfigCallout(children);
  const { childPages: stepPages, bodyBlocks } = partitionBlocks(rest);
  const cfg = parseUnitConfig(config);

  const dayIndex = order;
  const unlockOffsetDays = cfg.unlockOffsetDays ?? order - 1;

  const meta: UnitMeta = {
    notionId: unitBlock.id,
    slug: slugify(title),
    title,
    order,
    programNotionId,
    programSlug,
    durationMinutes: cfg.durationMinutes ?? null,
    dayIndex,
    unlockOffsetDays,
    unlockAt: cfg.unlockAt ?? null,
    summary: null,
    accessTier: cfg.accessTier,
  };

  const totalSteps = stepPages.length;
  const steps = stepPages
    .map((sp, idx) =>
      buildStepFromBlock(sp, unitBlock.id, idx + 1, idx === 0, idx === totalSteps - 1),
    )
    .filter((s): s is ProgramTreeStep => s !== null);

  return { meta, bodyBlocks, steps };
}

// ─── Fetchers Notion direct (bypass KV — utilisés par le job de sync) ───

/** Filtre un ProgramMeta[] selon les options publiques vs admin. */
function filterMetas(
  metas: ProgramMeta[],
  opts: { includeUnlisted?: boolean; includeDrafts?: boolean },
): ProgramMeta[] {
  return metas.filter((m) => {
    if (!opts.includeDrafts && m.publishingStatus === 'draft') return false;
    if (!opts.includeUnlisted && m.visibility !== 'public') return false;
    return true;
  });
}

/** Fetch TOUS les ProgramMeta depuis Notion (inclut drafts + unlisted + private). */
export async function listAllProgramsFromNotion(): Promise<ProgramMeta[]> {
  if (!PROGRAMS_DB) return [];
  const pages = await queryAll(PROGRAMS_DB);
  const metas = pages
    .filter((p) => {
      const maybe = p as PageObjectResponse & { in_trash?: boolean; archived?: boolean };
      return !maybe.in_trash && !maybe.archived;
    })
    .map(mapProgram)
    .filter((m): m is ProgramMeta => m !== null);
  metas.sort((a, b) => a.slug.localeCompare(b.slug));
  return metas;
}

/** Récupère un programme par slug depuis Notion (inclut draft/unlisted/private). */
export async function getProgramBySlug(slug: string): Promise<ProgramMeta | null> {
  if (!PROGRAMS_DB || !slug) return null;
  const r = await notion.databases.query({
    database_id: PROGRAMS_DB,
    filter: {
      property: 'slug',
      rich_text: { equals: slug },
    },
    page_size: 1,
  });
  const page = r.results[0];
  if (!page || (page as { object: string }).object !== 'page') return null;
  return mapProgram(page as PageObjectResponse);
}

/**
 * Construit un ProgramTree depuis Notion (bypass KV). Utilisé par le job de sync.
 *
 * Traverse :
 *  - DB query par slug → ProgramMeta
 *  - pageBlocksDeepCached(programId) → récupère récursivement le programme + toutes
 *    ses child_pages (Units + Steps) + leurs blocs.
 *  - Walk in-memory pour extraire Units/Steps + leurs body blocks.
 */
export async function buildProgramTreeFromNotion(slug: string): Promise<ProgramTree | null> {
  const programMetaRaw = await getProgramBySlug(slug);
  if (!programMetaRaw) return null;

  // Auto-mirror images Notion-hosted → Cloudinary (idempotent via cache KV).
  // Pour les URLs externes (Cloudinary, Unsplash, etc.) → no-op, garde tel quel.
  const [coverImageUrl, thumbnailUrl] = await Promise.all([
    mirrorIfNotionHosted(programMetaRaw.coverImageUrl ?? null, `programs/${slug}/cover`),
    mirrorIfNotionHosted(programMetaRaw.thumbnailUrl ?? null, `programs/${slug}/thumb`),
  ]);
  const programMeta: ProgramMeta = {
    ...programMetaRaw,
    coverImageUrl,
    thumbnailUrl,
  };

  let programBlocks: AugmentedBlock[] = [];
  try {
    programBlocks = (await pageBlocksDeepCached(
      programMeta.notionId,
    )) as unknown as AugmentedBlock[];
  } catch {
    programBlocks = [];
  }

  const { childPages: unitPages, bodyBlocks, pinnedCallouts } = partitionBlocks(programBlocks);
  const pinnedResourcesRaw = parsePinnedResources(pinnedCallouts);

  // Hydrate les ressources internes : fetch leurs blocs Notion (bodyBlocks)
  // pour rendu instantané sur /programs/[slug]/r/[resourceSlug] depuis le KV.
  const pinnedResources = await Promise.all(
    pinnedResourcesRaw.map(async (r) => {
      if (r.kind !== 'internal' || !r.notionId) return r;
      try {
        const blocks = (await pageBlocksDeepCached(r.notionId)) as unknown as AugmentedBlock[];
        // Filtre les meta-callouts si jamais l'user a mis un ⚙️ Config dans la ressource
        const cleaned = blocks.filter((b) => !isConfigCallout(b) && !isPinnedCallout(b));
        return { ...r, bodyBlocks: cleaned };
      } catch {
        return r; // garde la ressource en sidebar même si fetch échoue
      }
    }),
  );

  const units = unitPages
    .map((up, idx) => buildUnitFromBlock(up, programMeta.notionId, programMeta.slug, idx + 1))
    .filter((u): u is ProgramTreeUnit => u !== null);

  const cleanBody = bodyBlocks.filter((b) => !isPinnedCallout(b));

  return {
    meta: programMeta,
    bodyBlocks: cleanBody,
    pinnedResources,
    units,
    syncedAt: new Date().toISOString(),
  };
}

// ─── Public API (stale-while-revalidate : KV first, fallback Notion) ───

/**
 * Liste tous les programmes visibles.
 *
 * Comportement :
 *  1. Tente de lire l'index depuis KV (cache warm)
 *  2. Si KV miss : fallback Notion direct + écrit KV en background
 *  3. Filtre selon les options (drafts, unlisted)
 *
 * Pour le listing public /programs : pas d'opts.
 * Pour l'admin : `{ includeUnlisted: true, includeDrafts: true }`.
 */
export async function listPrograms(
  opts: { includeUnlisted?: boolean; includeDrafts?: boolean } = {},
): Promise<ProgramMeta[]> {
  // 1. Tentative KV
  const fromKv = await getProgramsIndexFromKV();
  if (fromKv && fromKv.length > 0) {
    return filterMetas(fromKv, opts);
  }

  // 2. Fallback Notion direct + write-through en background
  const allFromNotion = await listAllProgramsFromNotion();
  // Fire-and-forget : on écrit le cache sans attendre
  void setProgramsIndexInKV(allFromNotion);
  return filterMetas(allFromNotion, opts);
}

/**
 * Récupère le tree complet d'un programme.
 *
 *   1. KV lookup (`program:v3:{slug}`) → retour instantané si hit
 *   2. Fallback : buildProgramTreeFromNotion → write-through KV en background
 */
export async function getProgramTree(slug: string): Promise<ProgramTree | null> {
  // 1. Tentative KV
  const fromKv = await getProgramTreeFromKV(slug);
  if (fromKv) {
    // Prime le cache in-memory pour ActivityContent (au cas où il fetch via legacy path)
    primeInMemoryCacheFromTree(fromKv);
    return fromKv;
  }

  // 2. Fallback Notion direct + write-through
  const tree = await buildProgramTreeFromNotion(slug);
  if (tree) {
    void setProgramTreeInKV(slug, tree);
  }
  return tree;
}

/**
 * Après lecture KV, pré-peuple le cache in-memory des blocks pour que les
 * appelants qui font `pageBlocksDeepCached(stepId)` (legacy path) trouvent des
 * blocs déjà en cache plutôt que de refetch Notion.
 *
 * Note : le cache in-memory reste valide tant que le process Node tourne.
 * Sur serverless cold start, il se repeuple au prochain call getProgramTree.
 */
function primeInMemoryCacheFromTree(tree: ProgramTree): void {
  // Les blocs steps sont déjà dans tree.units[].steps[].bodyBlocks
  // On les cache sous la clé `page:{stepId}:{syncedAt}` pour que pageBlocksDeepCached
  // les trouve si jamais il est appelé avec ce stepId.
  // Note : la clé utilise syncedAt comme version ; ActivityContent passe maintenant
  // les blocs directement, donc c'est un backup.
  const version = tree.syncedAt ?? new Date().toISOString();
  for (const unit of tree.units) {
    cacheSet(`page:${unit.meta.notionId}:${version}`, unit.bodyBlocks, 30 * 60 * 1000);
    for (const step of unit.steps) {
      cacheSet(`page:${step.meta.notionId}:${version}`, step.bodyBlocks, 30 * 60 * 1000);
    }
  }
}
