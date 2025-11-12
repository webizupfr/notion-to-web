import 'server-only';

import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

import type {
  PageObjectResponse,
  QueryDatabaseResponse,
  QueryDatabaseParameters,
  BlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';

import { getPageMeta, pageBlocksDeep, queryDb, getPage } from '@/lib/notion';
import type { NotionBlock } from '@/lib/notion';
import { mirrorRemoteImage } from '@/lib/media';
import { fetchRecordMap } from '@/lib/notion-record';
import { extractHints } from '@/lib/record-hints';
import { extractCollectionBundles } from '@/lib/collection-extractor';
import {
  getPageBundle,
  setPageBundle,
  setDbBundleCache,
  setPostsIndex,
  setHubsIndex,
  setWorkshopBundle,
  setWorkshopsIndex,
  setSprintBundle,
  setSprintsIndex,
  getSprintsIndex,
  type PageBundle,
  type WorkshopBundle,
  type WorkshopsIndex,
  type SprintsIndex,
  type SprintActivity,
  type SprintModule,
  type SprintBundle,
} from '@/lib/content-store';
import { parseYaml } from '@/lib/meta';
import { WorkshopMetaSchema, SprintMetaSchema, ModuleMetaSchema } from '@/lib/meta-schemas';
import type { PageMeta, PostMeta, NavItem, HubMeta, LearningPath, DayEntry, ActivityStep, SprintSettings, ModuleSettings } from '@/lib/types';
import { notion } from '@/lib/notion';
import type { DbBundle } from '@/lib/db-render';
import { fetchDatabaseBundle } from '@/lib/db-render';
import { resolveDatabaseIdFromBlock, type LinkedDatabaseBlock } from '@/lib/resolve-db-id';

export const runtime = 'nodejs';
export const maxDuration = 60; // Limite pour appel direct (backup)

const PAGES_DB = process.env.NOTION_PAGES_DB;
const POSTS_DB = process.env.NOTION_POSTS_DB;
const HUBS_DB = process.env.NOTION_HUBS_DB;
const WORKSHOPS_DB = process.env.NOTION_WORKSHOPS_DB;
const SPRINTS_DB = process.env.NOTION_SPRINTS_DB;
const CRON_SECRET = process.env.CRON_SECRET;
const SYNC_FAILURE_WEBHOOK = process.env.SYNC_FAILURE_WEBHOOK;

type ImageFallback = {
  slug: string;
  pageId: string;
  blockId?: string;
  sourceUrl: string;
  reason: string;
};

type SyncStats = {
  imageMirrored: number;
  imageFallbacks: ImageFallback[];
  missingBlocks: Set<string>;
  recordMapPages: number;
  buttonsConverted: number;
  buttonSources: Array<{ slug: string; pageId: string; blockId: string }>;
  unsupportedBlocks: Array<{ slug: string; pageId: string; blockId: string }>;
  databaseChildrenSynced: number;
  childPagesSynced: number;
  pagesSkipped: number;
  hubsSynced: number;
  workshopsSynced: number;
  sprintsSynced: number;
};

const DEFAULT_CHILD_MAX_DEPTH = 2;

const canonicalId = (value: string | null | undefined) =>
  value ? value.replace(/-/g, '').toLowerCase() : undefined;

const findTitleProperty = (properties: PageObjectResponse['properties']): PageObjectResponse['properties'][string] | undefined => {
  for (const key of Object.keys(properties ?? {})) {
    const prop = properties[key];
    if (prop && prop.type === 'title') return prop;
  }
  return undefined;
};

const findPropByName = (
  properties: PageObjectResponse['properties'],
  names: string[]
): PageObjectResponse['properties'][string] | undefined => {
  const candidates = names.map((name) => name.toLowerCase());
  for (const key of Object.keys(properties ?? {})) {
    const lower = key.toLowerCase();
    if (candidates.includes(lower)) return properties[key];
  }
  return undefined;
};

const getMultiSelect = (property: PageObjectResponse['properties'][string] | undefined): string[] => {
  if (!property) return [];
  if (property.type === 'multi_select') return property.multi_select?.map((tag) => tag.name) ?? [];
  return [];
};

const getRelationIds = (property: PageObjectResponse['properties'][string] | undefined): string[] => {
  if (!property || property.type !== 'relation') return [];
  return (property.relation ?? []).map((rel) => rel.id);
};

const computeRelativeIso = (startIso: string | null, offsetDays: number | null, time: string | null): string | null => {
  if (!startIso) return null;
  const base = new Date(startIso);
  if (!Number.isFinite(offsetDays)) {
    // keep base date
  } else if (offsetDays) {
    base.setUTCDate(base.getUTCDate() + Number(offsetDays));
  }
  if (time && /^\d{1,2}:\d{2}$/.test(time)) {
    const [h, m] = time.split(':').map((v) => Number(v));
    base.setUTCHours(h, m, 0, 0);
  }
  return base.toISOString();
};

type ChildContext = {
  maxDepth: number;
  currentDepth: number;
};

type SyncOptions = {
  type: 'page' | 'post';
  stats: SyncStats;
  force?: boolean;
  childContext?: ChildContext;
  metaOverrides?: Partial<PageBundle['meta']>;
};

async function notifySyncFailure(payload: Record<string, unknown>) {
  if (!SYNC_FAILURE_WEBHOOK) return;
  try {
    await fetch(SYNC_FAILURE_WEBHOOK, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('[sync] failure webhook error', error);
  }
}

type HubReference = {
  slug: string;
  title: string;
  notionId: string;
};

type LoadedModule = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  order: number;
  duration?: number | null;
  tags: string[];
  dayIndex?: number | null;
  unlockAt?: string | null;
  unlockOffsetDays?: number | null;
  unlockTime?: string | null;
  settings: ModuleSettings | null;
  activityIds: string[];
};

type LoadedActivity = {
  id: string;
  slug: string;
  title: string;
  type?: string | null;
  duration?: number | null;
  summary?: string | null;
  tags: string[];
  widgetYaml?: string | null;
  order?: number | null;
};

async function syncWorkshops(
  opts: { stats: SyncStats; force?: boolean },
  hubMap: Map<string, HubReference>,
  initialPages?: PageObjectResponse[]
) {
  if (!WORKSHOPS_DB) return;

  const workshopPages = initialPages ?? (await collectDatabasePagesSafe(WORKSHOPS_DB, 'workshops'));

  if (!workshopPages.length) {
    await setWorkshopsIndex({ items: [], syncedAt: new Date().toISOString() });
    return;
  }

  const workshopIndex: WorkshopsIndex['items'] = [];
  const hubBundleCache = new Map<string, PageBundle | null>();

  for (const workshop of workshopPages) {
    try {
      const properties = workshop.properties ?? {};
      const title = extractTitle(findTitleProperty(properties));
      let slug = firstRichText(findPropByName(properties, ['slug'])) ?? null;
      if (!slug) {
        // derive a slug from title as a fallback
        const base = (title || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        slug = base || (canonicalId(workshop.id) ?? workshop.id);
        console.warn('[workshop] missing slug -> derived', { pageId: workshop.id, slug });
      }

      const hubProp = findPropByName(properties, ['derived_from_hub', 'hub']);
      const hubRelationId = hubProp?.type === 'relation' ? hubProp.relation?.[0]?.id ?? null : null;
      const canonicalHubId = canonicalId(hubRelationId ?? undefined) ?? hubRelationId ?? undefined;
      const hubInfo = canonicalHubId ? hubMap.get(canonicalHubId) : undefined;
      if (!hubInfo) {
        console.warn('[workshop] hub not found', { slug, hubRelationId });
        continue;
      }

      let hubBundle = hubBundleCache.get(hubInfo.slug);
      if (hubBundle === undefined) {
        hubBundle = await getPageBundle(hubInfo.slug);
        hubBundleCache.set(hubInfo.slug, hubBundle);
      }
      if (!hubBundle) {
        console.warn('[workshop] hub bundle missing', { slug, hub: hubInfo.slug });
        continue;
      }

      const rawDays = hubBundle.meta.learningPath?.days ?? [];
      const dayMap = new Map<string, DayEntry>();
      rawDays.forEach((day) => {
        const id = canonicalId(day.id) ?? day.id;
        if (id) dayMap.set(id, day);
      });

      const daysProp = findPropByName(properties, ['days_selected', 'days']);
      const dayIds =
        daysProp?.type === 'relation'
          ? (daysProp.relation ?? []).map((rel) => canonicalId(rel.id) ?? rel.id).filter(Boolean)
          : [];

      const selectedDays = (dayIds.length ? dayIds : rawDays.map((day) => canonicalId(day.id) ?? day.id))
        .map((id) => (id ? dayMap.get(id) : undefined))
        .filter((day): day is DayEntry => Boolean(day))
        .map((day) => ({ ...day }));

      const description = firstRichText(findPropByName(properties, ['description', 'desc', 'summary']));
      const visibilityRaw = (selectValue(findPropByName(properties, ['visibility'])) ?? 'public').toLowerCase();
      const visibility: 'public' | 'private' = visibilityRaw === 'private' ? 'private' : 'public';
      const password = firstRichText(findPropByName(properties, ['password', 'passcode']));

      const metaRaw = firstRichText(findPropByName(properties, ['meta', 'settings', 'config']));
      const { data: settings, error: metaError } = parseYaml(metaRaw, WorkshopMetaSchema);
      if (metaError) {
        console.warn('[workshop] meta parse error', { slug, metaError });
      }

      const bundle: WorkshopBundle = {
        slug,
        title,
        description,
        visibility,
        password: password ?? null,
        derivedHub: {
          slug: hubInfo.slug,
          title: hubInfo.title,
          notionId: hubInfo.notionId,
        },
        days: selectedDays,
        settings: settings ?? null,
        syncedAt: new Date().toISOString(),
      };

      await setWorkshopBundle(bundle);
      workshopIndex.push({ slug, title, visibility, hubSlug: hubInfo.slug });
      opts.stats.workshopsSynced += 1;
      await revalidateTag(`page:workshop:${slug}`);
      await revalidatePath(`/atelier/${slug}`, 'page');
    } catch (error) {
      console.error('[workshop] failed to sync', { pageId: workshop.id, error });
    }
  }

  await setWorkshopsIndex({ items: workshopIndex, syncedAt: new Date().toISOString() });
  await revalidateTag('page:workshop:index');
  await revalidatePath('/atelier', 'page');
}

async function loadModule(pageId: string, cache: Map<string, LoadedModule | null>): Promise<LoadedModule | null> {
  const key = canonicalId(pageId) ?? pageId;
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const page = (await notion.pages.retrieve({ page_id: pageId })) as PageObjectResponse;
    const properties = page.properties ?? {};
    const slug = firstRichText(findPropByName(properties, ['slug'])) ?? (canonicalId(pageId) ?? pageId);
    const title = extractTitle(findTitleProperty(properties));
    const description = firstRichText(findPropByName(properties, ['description', 'summary']));
    const order = numberValue(findPropByName(properties, ['order', 'ordre', 'index'])) ?? 0;
    const duration = numberValue(findPropByName(properties, ['duration', 'durée']));
    const dayIndex = numberValue(findPropByName(properties, ['day', 'jour', 'sprint_day', 'dayindex', 'day_index']));
    const tags = getMultiSelect(findPropByName(properties, ['tags', 'tag']));
    const unlockAt = dateValue(findPropByName(properties, ['unlock_at', 'unlockat', 'unlock']));
    const unlockOffsetDays = numberValue(findPropByName(properties, ['unlock_offset_days', 'offsetdays', 'offset']));
    const unlockTime = firstRichText(findPropByName(properties, ['unlock_time', 'time']));
    const metaRaw = firstRichText(findPropByName(properties, ['meta', 'settings', 'config']));
    const { data: settings, error } = parseYaml(metaRaw, ModuleMetaSchema);
    if (error) {
      console.warn('[sprint] module meta parse error', { moduleId: pageId, error });
    }
    // Support various naming conventions from Notion (e.g., "DB Activites", "DB Activités")
    const activityIds = getRelationIds(
      findPropByName(properties, [
        'activities',
        'activity',
        'db activites',
        'db activités',
        'db activities',
        'activites',
        'activités',
      ])
    );

    const loaded: LoadedModule = {
      id: pageId,
      slug,
      title,
      description,
      order,
      duration,
      tags,
      dayIndex,
      unlockAt,
      unlockOffsetDays,
      unlockTime,
      settings: settings ?? null,
      activityIds,
    };
    cache.set(key, loaded);
    return loaded;
  } catch (error) {
    console.error('[sprint] failed to load module', { moduleId: pageId, error });
    cache.set(key, null);
    return null;
  }
}

async function loadActivity(pageId: string, cache: Map<string, LoadedActivity | null>): Promise<LoadedActivity | null> {
  const key = canonicalId(pageId) ?? pageId;
  if (cache.has(key)) return cache.get(key) ?? null;
  try {
    const page = (await notion.pages.retrieve({ page_id: pageId })) as PageObjectResponse;
    const properties = page.properties ?? {};
    const slug = firstRichText(findPropByName(properties, ['slug'])) ?? (canonicalId(pageId) ?? pageId);
    const title = extractTitle(findTitleProperty(properties));
    const typeValue = selectValue(findPropByName(properties, ['type', 'category'])) ?? null;
    const duration = numberValue(findPropByName(properties, ['duration', 'durée']));
    const order = numberValue(findPropByName(properties, ['order', 'ordre', 'index']));
    const summary = firstRichText(findPropByName(properties, ['summary', 'resume', 'description']));
    const tags = getMultiSelect(findPropByName(properties, ['tags', 'tag']));
    const widgetYaml = firstRichText(findPropByName(properties, ['widget', 'template']));

    const loaded: LoadedActivity = {
      id: pageId,
      slug,
      title,
      type: typeValue,
      duration,
      summary,
      tags,
      widgetYaml,
      order,
    };
    cache.set(key, loaded);
    return loaded;
  } catch (error) {
    console.error('[sprint] failed to load activity', { activityId: pageId, error });
    cache.set(key, null);
    return null;
  }
}

function resolveModuleUnlock(
  module: LoadedModule,
  sprintSettings: SprintSettings | null,
  sprintStartIso: string | null
): { unlockAtISO: string | null; isLocked: boolean } {
  const now = Date.now();
  const moduleConfig = module.settings?.unlock;
  const mode = moduleConfig?.mode ?? sprintSettings?.unlock_strategy ?? 'none';

  let unlockAtISO: string | null = null;

  if (mode === 'none') {
    unlockAtISO = null;
  } else if (mode === 'absolute') {
    const candidate = moduleConfig?.at ?? module.unlockAt ?? null;
    if (candidate) {
      const parsed = new Date(candidate);
      if (!Number.isNaN(parsed.getTime())) unlockAtISO = parsed.toISOString();
    }
  } else if (mode === 'relative') {
    const offset = moduleConfig?.offsetDays ?? module.unlockOffsetDays ?? 0;
    const time = moduleConfig?.time ?? module.unlockTime ?? null;
    unlockAtISO = computeRelativeIso(sprintStartIso, offset ?? 0, time);
  }

  if (!unlockAtISO && module.unlockAt) {
    const parsed = new Date(module.unlockAt);
    if (!Number.isNaN(parsed.getTime())) unlockAtISO = parsed.toISOString();
  }

  if (!unlockAtISO && sprintSettings?.unlock_strategy === 'relative') {
    const offset = module.unlockOffsetDays ?? 0;
    const time = module.unlockTime ?? null;
    unlockAtISO = computeRelativeIso(sprintStartIso, offset, time);
  }

  const isLocked = unlockAtISO ? new Date(unlockAtISO).getTime() > now : false;
  return { unlockAtISO, isLocked };
}

async function syncSprints(opts: { stats: SyncStats; force?: boolean }, initialPages?: PageObjectResponse[]) {
  if (!SPRINTS_DB) return;

  const sprintPages = initialPages ?? (await collectDatabasePagesSafe(SPRINTS_DB, 'sprints'));

  if (!sprintPages.length) {
    // Si c'est une sync partielle (initialPages défini), ne pas écraser l'index global
    if (!initialPages) {
      await setSprintsIndex({ items: [], syncedAt: new Date().toISOString() });
    }
    return;
  }

  const sprintIndex: SprintsIndex['items'] = [];
  const moduleCache = new Map<string, LoadedModule | null>();
  const activityCache = new Map<string, LoadedActivity | null>();

  for (const sprint of sprintPages) {
    try {
      const properties = sprint.properties ?? {};
      const slug = firstRichText(findPropByName(properties, ['slug'])) ?? null;
      if (!slug) {
        console.warn('[sprint] missing slug', { pageId: sprint.id });
        continue;
      }

      const title = extractTitle(findTitleProperty(properties));
      const description = firstRichText(findPropByName(properties, ['description', 'summary']));
      const visibilityRaw = (selectValue(findPropByName(properties, ['visibility'])) ?? 'public').toLowerCase();
      const visibility: 'public' | 'private' = visibilityRaw === 'private' ? 'private' : 'public';
      const password = firstRichText(findPropByName(properties, ['password', 'passcode']));
      const timezone = firstRichText(findPropByName(properties, ['timezone', 'time_zone', 'tz'])) ?? 'Europe/Paris';

      const metaRaw = firstRichText(findPropByName(properties, ['meta', 'settings', 'config']));
      const { data: sprintSettings, error: sprintMetaError } = parseYaml(metaRaw, SprintMetaSchema);
      if (sprintMetaError) {
        console.warn('[sprint] meta parse error', { slug, sprintMetaError });
      }
      const effectiveTimezone = sprintSettings?.timezone ?? timezone;

      const startIso = dateValue(findPropByName(properties, ['startdatetime', 'start_date', 'start'])) ?? null;

      // Support various naming conventions (e.g., Notion property named "DB Modules")
      const moduleIds = getRelationIds(
        findPropByName(properties, [
          'modules',
          'module',
          'db modules',
          'db module',
          'db_modules',
          'dbmodules',
        ])
      );
      const modules: SprintBundle['modules'] = [];

      for (const moduleId of moduleIds) {
        const loadedModule = await loadModule(moduleId, moduleCache);
        if (!loadedModule) continue;

        const { unlockAtISO, isLocked } = resolveModuleUnlock(loadedModule, sprintSettings ?? null, startIso);

        const sprintModule = {
          slug: loadedModule.slug,
          title: loadedModule.title,
          order: loadedModule.order,
          dayIndex: (loadedModule.dayIndex ?? (loadedModule.unlockOffsetDays ?? null)) as number | null,
          description: loadedModule.description,
          duration: loadedModule.duration ?? undefined,
          tags: loadedModule.tags,
          isLocked,
          unlockAtISO: unlockAtISO ?? null,
          settings: loadedModule.settings,
        } as SprintModule;

        if (!isLocked) {
          const activities: SprintActivity[] = [];
          for (const activityId of loadedModule.activityIds) {
            const loadedActivity = await loadActivity(activityId, activityCache);
            if (!loadedActivity) continue;
            activities.push({
              slug: loadedActivity.slug,
              title: loadedActivity.title,
              notionId: activityId,
              type: loadedActivity.type ?? undefined,
              duration: loadedActivity.duration ?? undefined,
              summary: loadedActivity.summary ?? undefined,
              tags: loadedActivity.tags,
              widgetYaml: loadedActivity.widgetYaml ?? undefined,
              order: loadedActivity.order ?? undefined,
            });
          }
          // Tri des activités par ordre si disponible
          activities.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          if (activities.length) {
            sprintModule.activities = activities;
          }
        }

        modules.push(sprintModule);
      }

      modules.sort((a, b) => a.order - b.order);

      let contextBlocks: NotionBlock[] | null = null;
      let contextNavigation: NavItem[] | null = null;
      try {
        const rawBlocks = await pageBlocksDeep(sprint.id, 100);
        contextBlocks = await processBlocksMedia(rawBlocks, {
          slug,
          pageId: sprint.id,
          stats: opts.stats,
        });
        try {
          contextNavigation = buildNavigationStructure(contextBlocks, `sprint/${slug}`);
        } catch {
          contextNavigation = null;
        }
        try {
          await syncChildPages(
            `sprint/${slug}`,
            sprint.id,
            contextBlocks ?? [],
            { type: 'page', stats: opts.stats, force: opts.force },
            {
              parentTitle: title,
              parentSlug: `sprint/${slug}`,
              parentNavigation: contextNavigation ?? [],
              isHub: true,
              hubDescription: description ?? null,
            }
          );
        } catch (e) {
          console.warn('[sprint] sync child pages failed', { slug, error: e });
        }
      } catch (error) {
        console.warn('[sprint] context blocks fetch failed', { slug, sprintId: sprint.id, error });
      }

      const bundle: SprintBundle = {
        slug,
        title,
        description,
        visibility,
        password: password ?? null,
        timezone: effectiveTimezone,
        settings: sprintSettings ?? null,
        modules,
        contextBlocks: contextBlocks ?? null,
        contextNavigation: contextNavigation ?? null,
        contextNotionId: sprint.id,
        syncedAt: new Date().toISOString(),
      };

      await setSprintBundle(bundle);
      opts.stats.sprintsSynced += 1;
      sprintIndex.push({ slug, title, visibility, timezone: effectiveTimezone });
      await revalidateTag(`page:sprint:${slug}`);
      await revalidatePath(`/sprint/${slug}`, 'page');
    } catch (error) {
      console.error('[sprint] failed to sync sprint', { sprintId: sprint.id, error });
    }
  }

  // Si sync complète: on ré-écrit l'index. En partiel: on merge avec l'index existant.
  if (!initialPages) {
    await setSprintsIndex({ items: sprintIndex, syncedAt: new Date().toISOString() });
  } else {
    const existing = (await getSprintsIndex()) ?? { items: [], syncedAt: new Date().toISOString() };
    const map = new Map<string, (typeof existing.items)[number]>();
    for (const item of existing.items) map.set(item.slug, item);
    for (const item of sprintIndex) map.set(item.slug, item);
    await setSprintsIndex({ items: Array.from(map.values()), syncedAt: new Date().toISOString() });
  }
  await revalidateTag('page:sprint:index');
  await revalidatePath('/sprint', 'page');
}

function isFullPage(page: PageObjectResponse | BlockObjectResponse | unknown): page is PageObjectResponse {
  return typeof page === 'object' && page !== null && (page as { object?: string }).object === 'page';
}

function extractTitle(property: PageObjectResponse['properties'][string] | undefined): string {
  if (!property || property.type !== 'title') return 'Untitled';
  return property.title?.[0]?.plain_text ?? 'Untitled';
}

function firstRichText(property: PageObjectResponse['properties'][string] | undefined): string | null {
  if (!property) return null;
  if (property.type === 'rich_text') return property.rich_text?.[0]?.plain_text ?? null;
  if (property.type === 'title') return property.title?.[0]?.plain_text ?? null;
  if (property.type === 'url') return property.url ?? null;
  return null;
}

function selectValue(property: PageObjectResponse['properties'][string] | undefined): string | null {
  if (!property) return null;
  if (property.type === 'select') return property.select?.name ?? null;
  return null;
}

function numberValue(property: PageObjectResponse['properties'][string] | undefined): number | null {
  if (!property) return null;
  if (property.type === 'number') return property.number ?? null;
  if (property.type === 'select') {
    const raw = property.select?.name ?? '';
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (property.type === 'rich_text') {
    const raw = property.rich_text?.[0]?.plain_text ?? '';
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function dateValue(property: PageObjectResponse['properties'][string] | undefined): string | null {
  if (!property) return null;
  if (property.type === 'date') return property.date?.start ?? null;
  return null;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

async function collectDatabasePages(databaseId: string): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;
  const options: Partial<QueryDatabaseParameters> = { page_size: 100 };

  do {
    const response: QueryDatabaseResponse = await queryDb(databaseId, {
      ...options,
      start_cursor: cursor,
    });
    const onlyPages = response.results.filter(isFullPage);
    pages.push(...onlyPages);
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return pages;
}

async function collectDatabasePagesSafe(databaseId: string | undefined, label: string): Promise<PageObjectResponse[]> {
  if (!databaseId) return [];
  try {
    return await collectDatabasePages(databaseId);
  } catch (error) {
    console.warn(`[sync] skip ${label}: inaccessible or missing permissions`, error);
    return [];
  }
}

async function collectLinkedDatabaseIds(blocks: NotionBlock[]): Promise<Set<string>> {
  const ids = new Set<string>();

  async function traverse(blockList: NotionBlock[]) {
    for (const block of blockList) {
      if (block.type === 'child_database' || block.type === 'link_to_page') {
        const databaseId = await resolveDatabaseIdFromBlock(block as LinkedDatabaseBlock);
        if (databaseId) ids.add(databaseId);
      }

      const children = (block as { __children?: NotionBlock[] }).__children;
      if (children?.length) {
        await traverse(children);
      }
    }
  }

  await traverse(blocks);
  return ids;
}

type AugmentedBlock = NotionBlock & { __children?: NotionBlock[] };

function getBlockChildren(block: NotionBlock): NotionBlock[] {
  return ((block as { __children?: NotionBlock[] }).__children ?? []) as NotionBlock[];
}

async function processBlocksMedia(
  blocks: NotionBlock[],
  context: { slug: string; pageId: string; stats: SyncStats }
): Promise<NotionBlock[]> {
  const processed: NotionBlock[] = [];

  for (const block of blocks) {
    const clone = structuredClone(block) as AugmentedBlock;

    if (block.type === 'image') {
      const imageBlock = clone as Extract<AugmentedBlock, { type: 'image' }>;
      const image = imageBlock.image;
      const sourceUrl = image.type === 'external' ? image.external.url : image.file.url;
      const fileMeta = image.type === 'file' ? (image.file as { mime_type?: string; type?: string; url: string; expiry_time?: string }) : null;
      const contentTypeHint = fileMeta?.mime_type ?? fileMeta?.type ?? null;
      if (sourceUrl) {
        const key = `notion-pages/${context.pageId}/blocks/${block.id}`;
        const mirrored = await mirrorRemoteImage({
          sourceUrl,
          targetKey: key,
          contentTypeHint,
        });
        const mirroredUrl = mirrored.url;
        if (mirrored.mirrored) {
          context.stats.imageMirrored += 1;
        } else {
          context.stats.imageFallbacks.push({
            slug: context.slug,
            pageId: context.pageId,
            blockId: block.id,
            sourceUrl,
            reason: mirrored.fallbackReason ?? 'unknown',
          });
        }
        if (image.type === 'external') {
          const external = (imageBlock.image as Extract<typeof imageBlock.image, { type: 'external' }>).external;
          external.url = mirroredUrl;
        } else {
          const file = (imageBlock.image as Extract<typeof imageBlock.image, { type: 'file' }>).file;
          file.url = mirroredUrl;
        }
        // attach intrinsic size for rendering
        (imageBlock as unknown as Record<string, unknown>).__image_meta = {
          width: mirrored.width,
          height: mirrored.height,
        };
      }
    }

    const children = (block as AugmentedBlock).__children;
    if (children?.length) {
      clone.__children = await processBlocksMedia(children, context);
    }

    processed.push(clone);
  }

  return processed;
}

async function mirrorCover(
  url: string | null,
  context: { slug: string; pageId: string; kind: 'cover' | 'icon'; stats: SyncStats }
): Promise<string | null> {
  if (!url) return null;
  if (!url.startsWith('http')) return url;
  const key = `notion-pages/${context.pageId}/${context.kind}`;
  const mirrored = await mirrorRemoteImage({ sourceUrl: url, targetKey: key });
  if (mirrored.mirrored) {
    context.stats.imageMirrored += 1;
  } else {
    context.stats.imageFallbacks.push({
      slug: context.slug,
      pageId: context.pageId,
      reason: mirrored.fallbackReason ?? 'unknown',
      sourceUrl: url,
    });
  }
  return mirrored.url;
}

async function mirrorDatabaseBundle(databaseId: string, context: { slug: string; stats: SyncStats }): Promise<DbBundle> {
  const bundle = await fetchDatabaseBundle(databaseId);
  const items = await Promise.all(
    bundle.items.map(async (item) => {
      if (!item.cover || !item.cover.startsWith('http')) return item;
      const key = `notion-databases/${databaseId}/${item.id}/cover`;
      const mirrored = await mirrorRemoteImage({ sourceUrl: item.cover, targetKey: key });
      if (mirrored.mirrored) {
        context.stats.imageMirrored += 1;
      } else {
        context.stats.imageFallbacks.push({
          slug: context.slug,
          pageId: databaseId,
          blockId: item.id,
          sourceUrl: item.cover,
          reason: mirrored.fallbackReason ?? 'unknown',
        });
      }
      return { ...item, cover: mirrored.url };
    })
  );
  return { ...bundle, items };
}

async function syncPage(page: PageObjectResponse, opts: SyncOptions) {
  const slug = firstRichText(page.properties.slug);
  if (!slug) return null;

  const title = extractTitle(page.properties.Title);
  const visibility = (selectValue(page.properties.visibility) as PageMeta['visibility']) ?? 'public';
  const password = firstRichText(page.properties.password);
  const properties = page.properties as Record<string, PageObjectResponse['properties'][string] | undefined>;

  const metaInfo = await getPageMeta(page.id);
  const existing = await getPageBundle(slug);
  
  // Skip si la page n'a pas été modifiée (sync sélectif)
  if (!opts.force && existing && existing.meta.lastEdited === metaInfo.lastEdited) {
    console.log(`[sync] ⏭️  Skipping "${slug}" - not modified since last sync`);
    opts.stats.pagesSkipped += 1;
    return existing.meta;
  }
  
  console.log(`[sync] 🔄 Syncing "${slug}" (${existing ? 'updated' : 'new'})`);

  const handledDatabases = new Set<string>();
  const childContext = opts.childContext ?? { maxDepth: DEFAULT_CHILD_MAX_DEPTH, currentDepth: 0 };
  const canSyncChildren = childContext.currentDepth < childContext.maxDepth;
  const nextChildContext: ChildContext = {
    maxDepth: childContext.maxDepth,
    currentDepth: childContext.currentDepth + 1,
  };

  const blocks = await pageBlocksDeep(page.id, 100, {
    onMissingBlock: (id) => opts.stats.missingBlocks.add(`${slug}:${id}`),
  });
  const collectUnsupported = (nodes: NotionBlock[] | undefined) => {
    if (!nodes) return;
    for (const node of nodes) {
      if (node.type === 'unsupported') {
        opts.stats.unsupportedBlocks.push({ slug, pageId: page.id, blockId: node.id });
      }
      const children = (node as AugmentedBlock).__children;
      if (children?.length) collectUnsupported(children as NotionBlock[]);
    }
  };
  collectUnsupported(blocks as NotionBlock[]);
  const processedBlocks = await processBlocksMedia(blocks, {
    slug,
    pageId: page.id,
    stats: opts.stats,
  });

  const recordMap = await fetchRecordMap(page.id);
  if (recordMap) {
    opts.stats.recordMapPages += 1;
    const hints = extractHints(recordMap);
    console.log('[recordMap] hints', {
      columns: Object.keys(hints.columns).length,
      images: Object.keys(hints.images).length,
      buttons: Object.keys(hints.buttons).length,
    });

  const registerButton = (blockId: string) => {
    if (opts.stats.buttonSources.some((entry) => entry.blockId === blockId)) return;
    opts.stats.buttonSources.push({ slug, pageId: page.id, blockId });
    opts.stats.buttonsConverted += 1;
    const normalized = normalizeId(blockId);
    opts.stats.unsupportedBlocks = opts.stats.unsupportedBlocks.filter((entry) => {
      const entryNormalized = normalizeId(entry.blockId);
      return entry.blockId !== blockId && entryNormalized !== normalized;
    });
  };

  const normalizeId = (value: string | undefined | null) =>
    value ? value.replace(/-/g, '') : undefined;

    const getHint = <T,>(collection: Record<string, T>, id: string): T | undefined => {
      const direct = collection[id];
      if (direct !== undefined) return direct;
      const normalized = normalizeId(id);
      return normalized ? collection[normalized] : undefined;
    };

    const findBlockById = (items: NotionBlock[] | undefined, targetId: string): NotionBlock | null => {
      if (!items?.length) return null;
      const normalizedTarget = normalizeId(targetId);
      for (const item of items) {
        const normalizedItem = normalizeId(item.id);
        if (normalizedItem && normalizedItem === normalizedTarget) return item;
        const child = findBlockById((item as AugmentedBlock).__children, targetId);
        if (child) return child;
      }
      return null;
    };

    if (Object.keys(hints.columns).length) {
      for (const listBlock of processedBlocks) {
        if (listBlock.type !== 'column_list') continue;
        const columns = getBlockChildren(listBlock);
        const ratios: number[] = [];
        let hasExplicit = false;

        for (const column of columns) {
          const hint = getHint(hints.columns, column.id);
          if (hint?.ratio !== undefined) {
            ratios.push(Math.max(Number(hint.ratio) || 0.01, 0.01));
            hasExplicit = true;
          } else {
            ratios.push(1);
          }
        }

        if (!hasExplicit) {
          const widthHints = columns.map((column) => getHint(hints.columns, column.id)?.widthPx ?? 0);
          if (widthHints.some((w) => w > 0)) {
            const totalWidth = widthHints.reduce((acc, val) => acc + (val > 0 ? val : 0), 0) || 1;
            const normalized = widthHints.map((w) => (w > 0 ? w / totalWidth : 1 / columns.length));
            (listBlock as unknown as { __column_ratios?: number[] }).__column_ratios = normalized;
            continue;
          }
        }

        if (hasExplicit) {
          const total = ratios.reduce((acc, val) => acc + val, 0) || 1;
          const normalized = ratios.map((r) => r / total);
          (listBlock as unknown as { __column_ratios?: number[] }).__column_ratios = normalized;
        }
      }
    }

    if (Object.keys(hints.images).length) {
      const applyImageHints = (block: NotionBlock) => {
        if (block.type === 'image') {
          const hint = getHint(hints.images, block.id);
          if (hint) {
            const meta = ((block as unknown as Record<string, unknown>).__image_meta ||= {}) as {
              width?: number;
              height?: number;
              maxWidthPx?: number;
              align?: 'left' | 'center' | 'right';
            };
            if (hint.widthPx) meta.maxWidthPx = hint.widthPx;
            if (hint.align) meta.align = hint.align;
          }
        }
        const children = (block as { __children?: NotionBlock[] }).__children;
        children?.forEach(applyImageHints);
      };
      processedBlocks.forEach(applyImageHints);
    }

    if (Object.keys(hints.buttons).length) {
      const applyButtonHints = (block: NotionBlock) => {
        if (block.type === 'unsupported') {
          const hint = getHint(hints.buttons, block.id);
          if (hint) {
            const augmented = block as unknown as Record<string, unknown>;
            augmented.type = 'button';
            augmented.button = hint;
            registerButton(block.id);
            return;
          }
        }
        const children = (block as { __children?: NotionBlock[] }).__children;
        children?.forEach(applyButtonHints);
      };
      processedBlocks.forEach(applyButtonHints);

      for (const [blockId, hint] of Object.entries(hints.buttons)) {
        const existing = findBlockById(processedBlocks, blockId);
        if (existing) continue;

        const normalizedId = normalizeId(blockId) ?? blockId;
        const recordEntry = recordMap.block?.[normalizedId];
        const parentIdRaw = (recordEntry as { value?: { parent_id?: string } } | undefined)?.value?.parent_id;
        const parent = parentIdRaw ? findBlockById(processedBlocks, parentIdRaw) : null;

        const synthetic: NotionBlock = {
          object: 'block',
          id: blockId,
          type: 'button',
          has_children: false,
          button: hint,
        } as NotionBlock;

        if (parent) {
          const augmentedParent = parent as AugmentedBlock;
          (augmentedParent.__children ||= []).push(synthetic);
        } else {
          processedBlocks.push(synthetic);
        }

        registerButton(blockId);
        console.log('[recordMap] injected button', { slug, pageId: page.id, blockId });
      }
    }

    const buttonEntries = Object.values(recordMap.block ?? {})
      .map((entry) => (entry as { value?: { type?: string } } | undefined)?.value)
      .filter((value): value is { id: string; type?: string; properties?: Record<string, unknown>; format?: Record<string, unknown>; parent_id?: string } =>
        Boolean(value && value.type === 'button')
      );

    if (buttonEntries.length) {
      const getPlainText = (prop: unknown): string => {
        if (!prop) return '';
        if (Array.isArray(prop)) {
          return (
            prop
              .map((segment) => {
                if (Array.isArray(segment)) {
                  const text = segment[0];
                  return typeof text === 'string' ? text : '';
                }
                return '';
              })
              .join('') || ''
          ).trim();
        }
        return '';
      };

      const styleFromFormat = (format: Record<string, unknown> | undefined): 'primary' | 'ghost' => {
        const raw = String(
          (format?.button_style ?? (format?.button as { style?: string } | undefined)?.style ?? '')
        ).toLowerCase();
        if (raw.includes('ghost') || raw.includes('secondary') || raw.includes('outline')) return 'ghost';
        return 'primary';
      };

      const urlFromFormat = (format: Record<string, unknown> | undefined): string => {
        const primary = typeof format?.button_url === 'string' ? format.button_url : undefined;
        const nested = ((format?.button as { url?: string } | undefined)?.url ?? '') as string;
        return (primary ?? nested ?? '').trim();
      };

      for (const value of buttonEntries) {
        const blockId = value.id;
        if (opts.stats.buttonSources.some((entry) => entry.blockId === blockId)) continue;
        const label = getPlainText((value.properties as Record<string, unknown> | undefined)?.title);
        const url = urlFromFormat(value.format as Record<string, unknown> | undefined);
        if (!label || !url) continue;
        const style = styleFromFormat(value.format as Record<string, unknown> | undefined);

        const parentIdRaw = value.parent_id;
        const parent = parentIdRaw ? findBlockById(processedBlocks, parentIdRaw) : null;

        const synthetic: NotionBlock = {
          object: 'block',
          id: blockId,
          type: 'button',
          has_children: false,
          button: { label, url, style },
        } as NotionBlock;

        if (parent) {
          const augmentedParent = parent as AugmentedBlock;
          (augmentedParent.__children ||= []).push(synthetic);
        } else {
          processedBlocks.push(synthetic);
        }

        registerButton(blockId);
        console.log('[recordMap] synthesized button', { slug, pageId: page.id, blockId });
      }
    }

    const collectionBundles = extractCollectionBundles(recordMap);
    if (collectionBundles.length) {
      const syncedAtIso = new Date().toISOString();
      for (const collection of collectionBundles) {
        if (!collection.databaseId) continue;
        handledDatabases.add(collection.databaseId);
        await setDbBundleCache({
          databaseId: collection.databaseId,
          cursor: collection.viewId || '_',
          bundle: collection.bundle,
          syncedAt: syncedAtIso,
        });
        await revalidateTag(`db:${collection.databaseId}`);
      }
    }
  }

  const plainBlocks = JSON.parse(JSON.stringify(processedBlocks)) as NotionBlock[];

  const cover = await mirrorCover(metaInfo.cover, {
    slug,
    pageId: page.id,
    kind: 'cover',
    stats: opts.stats,
  });
  const icon = await mirrorCover(metaInfo.icon, {
    slug,
    pageId: page.id,
    kind: 'icon',
    stats: opts.stats,
  });

  const description = firstRichText(properties.description);
  const strategyProp = selectValue(properties.sync_strategy);
  const maxDepthProp = numberValue(properties.max_depth);
  const syncPriorityProp = numberValue(properties.sync_priority);
  const universProp = selectValue(properties.univers);
  const pageTypeProp = selectValue(properties.type);

  // Récupérer le full_width depuis le RecordMap (l'API officielle ne le retourne pas)
  let fullWidth = false;
  try {
    console.log(`[sync] 🔍 Detecting full_width for "${slug}"...`);
    console.log(`[sync] RecordMap exists:`, !!recordMap);
    console.log(`[sync] RecordMap has blocks:`, !!recordMap?.block);
    
    if (recordMap?.block) {
      console.log(`[sync] Page ID:`, page.id);
      console.log(`[sync] RecordMap block keys:`, Object.keys(recordMap.block).slice(0, 5));
      
      // Essayer d'abord avec l'ID tel quel (avec tirets)
      let pageBlock = recordMap.block[page.id];
      
      // Si pas trouvé, essayer sans tirets
      if (!pageBlock) {
        const normalizedId = page.id.replace(/-/g, '');
        pageBlock = recordMap.block[normalizedId];
        console.log(`[sync] Tried normalized ID:`, normalizedId);
      }
      
      console.log(`[sync] Page block found:`, !!pageBlock);
      
      if (pageBlock) {
        const pageValue = pageBlock.value as { 
          format?: { 
            page_full_width?: boolean;
            page_cover_position?: number;
          } 
        } | undefined;
        console.log(`[sync] Page value format:`, pageValue?.format);
        fullWidth = Boolean(pageValue?.format?.page_full_width);
        console.log(`[sync] ✅ Full width detected for "${slug}":`, fullWidth);
      } else {
        console.warn(`[sync] ⚠️  Page block not found in RecordMap for "${slug}"`);
      }
    } else {
      console.warn(`[sync] ⚠️  No RecordMap blocks available for "${slug}"`);
    }
  } catch (error) {
    console.error(`[sync] ❌ Error detecting full_width for "${slug}":`, error);
    fullWidth = false;
  }

  const meta: PageBundle['meta'] = {
    slug,
    notionId: page.id,
    title,
    visibility,
    password,
    lastEdited: metaInfo.lastEdited,
    icon,
    cover,
    fullWidth,
  };
  if (description !== null) meta.description = description;
  if (strategyProp) meta.syncStrategy = strategyProp as PageMeta['syncStrategy'];
  if (universProp) {
    const u = String(universProp).toLowerCase();
    meta.univers = (u === 'lab' ? 'lab' : 'studio') as PageMeta['univers'];
  }
  if (pageTypeProp) {
    const t = String(pageTypeProp).toLowerCase();
    if (t === 'landing' || t === 'article' || t === 'offre' || t === 'programme') {
      meta.pageType = t as PageMeta['pageType'];
    }
  }
  if (typeof maxDepthProp === 'number') meta.maxDepth = maxDepthProp;
  if (typeof syncPriorityProp === 'number') meta.syncPriority = syncPriorityProp;
  if (opts.metaOverrides) {
    Object.assign(meta, opts.metaOverrides);
  }

  const bundle: PageBundle = {
    meta,
    blocks: plainBlocks,
    syncedAt: new Date().toISOString(),
  };

  await setPageBundle(slug, bundle);
  await revalidateTag(`page:${slug}`);
  if (opts.type === 'post') {
    await revalidatePath(`/blog/${slug}`, 'page');
  } else {
    await revalidatePath(`/${slug}`, 'page');
  }

  // Build navigation structure early so we can pass it to DB children
  console.log(`[sync] 🧭 Building navigation structure for "${slug}"...`);
  const navigation = buildNavigationStructure(blocks, slug);

  const linkedDbIds = await collectLinkedDatabaseIds(blocks);
  for (const databaseId of linkedDbIds) {
    if (handledDatabases.has(databaseId)) continue;
    const mirroredBundle = await mirrorDatabaseBundle(databaseId, {
      slug,
      stats: opts.stats,
    });
    await setDbBundleCache({
      databaseId,
      cursor: '_',
      bundle: mirroredBundle,
      syncedAt: new Date().toISOString(),
    });
    await revalidateTag(`db:${databaseId}`);

    // Synchroniser les pages enfants de la database
    // Avec délais séquentiels pour respecter les rate limits de Notion
    console.log(`[sync] 🔄 Syncing database children for ${databaseId}...`);
    await syncDatabaseChildren(
      databaseId,
      slug,
      {
        type: 'page',
        stats: opts.stats,
        force: opts.force,
        childContext: nextChildContext,
      },
      {
        parentTitle: meta.title,
        parentSlug: slug,
        parentNavigation: navigation,
        isHub: Boolean((meta as PageMeta).isHub),
        hubDescription: (meta as PageMeta).description ?? null,
        parentIcon: (meta as PageMeta).icon ?? null,
      }
    );
  }
  
  // Synchroniser les pages enfants (child_page blocks)
  // Avec délais pour respecter les rate limits de Notion (3 req/sec)
  console.log(`[sync] 🔍 Checking for child pages in "${slug}"...`);
  console.log(`[sync] Total blocks count: ${blocks.length}`);
  
  // Debug: afficher tous les types de blocks
  const blockTypes = blocks.map(b => b.type);
  console.log(`[sync] Block types found:`, blockTypes);
  
  let syncedChildren: Array<{ id: string; title: string; slug: string }> = [];
  if (canSyncChildren) {
    syncedChildren = await syncChildPages(
      slug,
      page.id,
      blocks,
      {
        type: 'page',
        stats: opts.stats,
        force: opts.force,
        childContext: nextChildContext,
      },
      {
        parentTitle: meta.title,
        parentSlug: slug,
        parentNavigation: navigation,
        isHub: Boolean(meta.isHub),
        hubDescription: meta.description ?? null,
        parentIcon: meta.icon ?? null,
      }
    );
  } else {
    console.log(
      `[sync] ⏭️  Skipping child sync for "${slug}" (depth ${childContext.currentDepth}/${childContext.maxDepth})`
    );
  }
  
  console.log(`[sync] 📄 Child pages synced for "${slug}": ${syncedChildren.length}`);
  if (syncedChildren.length > 0) {
    console.log(`[sync] Child pages:`, syncedChildren.map(c => c.title).join(', '));
  }
  
  // Ajouter la navigation et les child pages aux métadonnées
  if (navigation.length > 0) {
    meta.navigation = navigation;
    meta.childPages = syncedChildren; // Pour compatibilité
    
    // Mettre à jour le bundle avec la navigation
    const updatedBundle: PageBundle = {
      meta,
      blocks: plainBlocks,
      syncedAt: new Date().toISOString(),
    };
    await setPageBundle(slug, updatedBundle);
    console.log(`[sync] ✅ Updated bundle with navigation (${navigation.length} items, ${syncedChildren.length} child pages)`);
  } else {
    console.log(`[sync] ⚠️  No navigation structure found for "${slug}"`);
  }

  return meta;
}

async function syncHub(
  hub: PageObjectResponse,
  opts: { stats: SyncStats; force?: boolean }
): Promise<HubMeta | null> {
  const slug = firstRichText(hub.properties.slug);
  if (!slug) return null;

  const properties = hub.properties as Record<string, PageObjectResponse['properties'][string] | undefined>;
  const strategy = (selectValue(properties.sync_strategy) as PageMeta['syncStrategy']) ?? 'full';
  const maxDepthRaw = numberValue(properties.max_depth);
  const priorityRaw = numberValue(properties.sync_priority);
  const description = firstRichText(properties.description);
  const iconSelect = selectValue(properties.icon);

  const baseDepth = typeof maxDepthRaw === 'number' && Number.isFinite(maxDepthRaw) ? Math.max(maxDepthRaw, 0) : 2;
  const effectiveDepth = strategy === 'deep' ? baseDepth + 1 : baseDepth;
  const childMaxDepth = strategy === 'shallow' ? 0 : effectiveDepth;

  console.log(
    `[sync] 🏠 Syncing hub "${slug}" (strategy=${strategy}, maxDepth=${childMaxDepth}, priority=${priorityRaw ?? 'default'})`
  );

  const metaOverrides: Partial<PageBundle['meta']> = {
    isHub: true,
    syncStrategy: strategy,
    maxDepth: childMaxDepth,
  };
  if (typeof priorityRaw === 'number') {
    metaOverrides.syncPriority = priorityRaw;
  }
  if (description !== null) {
    metaOverrides.description = description;
  }
  if (iconSelect) {
    metaOverrides.icon = iconSelect;
  }

  const meta = await syncPage(hub, {
    type: 'page',
    stats: opts.stats,
    force: opts.force,
    childContext: { maxDepth: childMaxDepth, currentDepth: 0 },
    metaOverrides,
  });
  if (!meta) return null;

  // Attempt to detect inline databases for Jour / Activité and build learning path
  try {
    const learning = await buildLearningPathFromPage(hub.id, meta.slug);
    if (learning && learning.days.length) {
      const enriched = await getPageBundle(meta.slug);
      if (enriched) {
        enriched.meta.learningPath = learning;
        await setPageBundle(meta.slug, enriched);
        await revalidateTag(`page:${meta.slug}`);
      }
    }
  } catch (e) {
    console.warn('[sync] learningPath build failed', e);
  }

  opts.stats.hubsSynced += 1;

  return {
    slug: meta.slug,
    title: meta.title,
    description: meta.description ?? description ?? null,
    icon: meta.icon ?? iconSelect ?? null,
    notionId: meta.notionId,
    visibility: meta.visibility,
    password: meta.password ?? null,
    lastEdited: meta.lastEdited,
    syncStrategy: meta.syncStrategy,
    maxDepth: meta.maxDepth,
    syncPriority: meta.syncPriority,
  };
}

function normalize(text: string | null | undefined): string {
  return (text ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

async function findInlineDatabases(blocks: NotionBlock[]): Promise<string[]> {
  const ids = new Set<string>();
  const walk = async (list: NotionBlock[]) => {
    for (const b of list) {
      if ((b as { type?: string }).type === 'child_database' || (b as { type?: string }).type === 'link_to_page') {
        const id = await resolveDatabaseIdFromBlock(b as LinkedDatabaseBlock);
        if (id) ids.add(id);
      }
      const children = (b as { __children?: NotionBlock[] }).__children;
      if (children?.length) await walk(children);
    }
  };
  await walk(blocks);
  return Array.from(ids);
}

async function buildLearningPathFromPage(pageId: string, hubSlug: string): Promise<LearningPath | null> {
  const blocks = await pageBlocksDeep(pageId, 100);
  const dbIds = await findInlineDatabases(blocks);
  if (!dbIds.length) return null;

  let unitDb: { id: string; title: string; kind: 'days' | 'modules'; labels: { singular: string; plural: string }; slugPrefix: string } | null = null;
  let activiteDb: { id: string; title: string } | null = null;

  const unitPatterns: Array<{
    test: (value: string) => boolean;
    kind: 'days' | 'modules';
    singular: string;
    plural: string;
    slugPrefix: string;
  }> = [
    {
      test: (value) => value.includes('jour'),
      kind: 'days',
      singular: 'Jour',
      plural: 'Jours',
      slugPrefix: 'jour',
    },
    {
      test: (value) => value.includes('module'),
      kind: 'modules',
      singular: 'Module',
      plural: 'Modules',
      slugPrefix: 'module',
    },
    {
      test: (value) => value.includes('session'),
      kind: 'modules',
      singular: 'Session',
      plural: 'Sessions',
      slugPrefix: 'session',
    },
    {
      test: (value) => value.includes('phase'),
      kind: 'modules',
      singular: 'Phase',
      plural: 'Phases',
      slugPrefix: 'phase',
    },
    {
      test: (value) => value.includes('sprint'),
      kind: 'modules',
      singular: 'Sprint',
      plural: 'Sprints',
      slugPrefix: 'sprint',
    },
  ];

  for (const dbId of dbIds) {
    try {
      const db = await notion.databases.retrieve({ database_id: dbId });
      const title = ((db as { title?: Array<{ plain_text?: string }> }).title?.[0]?.plain_text ?? '').trim();
      const t = normalize(title);
      if (!unitDb) {
        const pattern = unitPatterns.find((entry) => entry.test(t));
        if (pattern) {
          unitDb = {
            id: dbId,
            title,
            kind: pattern.kind,
            labels: { singular: pattern.singular, plural: pattern.plural },
            slugPrefix: pattern.slugPrefix,
          };
        }
      }
      if (!activiteDb && /activit/.test(t)) activiteDb = { id: dbId, title };
    } catch {
      // ignore
    }
  }

  if (!unitDb || !activiteDb) return null;

  const days = await queryDb(unitDb.id, { page_size: 100 });
  const dayPages = (days.results as PageObjectResponse[]).filter((p) => p.object === 'page');

  const activities = await queryDb(activiteDb.id, { page_size: 200 });
  const activityPages = (activities.results as PageObjectResponse[]).filter((p) => p.object === 'page');

  const getNum = (prop: PageObjectResponse['properties'][string] | undefined): number | null => {
    if (!prop) return null;
    if (prop.type === 'number') return prop.number ?? null;
    if (prop.type === 'rich_text') {
      const raw = prop.rich_text?.[0]?.plain_text ?? '';
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };
  const getText = (prop: PageObjectResponse['properties'][string] | undefined): string | null => {
    if (!prop) return null;
    if (prop.type === 'title') return prop.title?.[0]?.plain_text ?? null;
    if (prop.type === 'rich_text') return prop.rich_text?.[0]?.plain_text ?? null;
    if (prop.type === 'url') return prop.url ?? null;
    return null;
  };
  const getSelect = (prop: PageObjectResponse['properties'][string] | undefined): string | null => {
    if (prop?.type === 'select') return prop.select?.name ?? null;
    if (prop?.type === 'status') return (prop as unknown as { status?: { name?: string } }).status?.name ?? null;
    return null;
  };
  const getDate = (prop: PageObjectResponse['properties'][string] | undefined): string | null => {
    if (prop?.type === 'date') return prop.date?.start ?? null;
    return null;
  };
  const getRelation = (prop: PageObjectResponse['properties'][string] | undefined): string[] => {
    if (prop?.type === 'relation') return prop.relation?.map((r) => r.id) ?? [];
    return [];
  };

  const findProp = (properties: PageObjectResponse['properties'], names: string[]): PageObjectResponse['properties'][string] | undefined => {
    const keys = Object.keys(properties);
    const normalized = keys.map((k) => ({ k, n: normalize(k) }));
    for (const want of names) {
      const wn = normalize(want);
      const hit = normalized.find((x) => x.n.includes(wn));
      if (hit) return properties[hit.k];
    }
    return undefined;
  };

  const relMap = new Map<string, ActivityStep[]>();
  for (const a of activityPages) {
    const props = a.properties;
    const title = getText(findProp(props, ['titre', 'title', 'name'])) ?? 'Étape';
    const order = getNum(findProp(props, ['ordre', 'order', 'index'])) ?? 1;
    // Type can be in a select or status; fallback to text if author used rich_text
    const type = getSelect(findProp(props, ['type', 'category'])) ?? getText(findProp(props, ['type', 'category']));
    const duration = getText(findProp(props, ['duree', 'durée', 'duration']));
    const url = getText(findProp(props, ['lien', 'url']));
    const instructions = getText(findProp(props, ['instructions', 'contenu', 'content', 'texte']));
    // Accept relation property pointing to the unit DB (jour/module/phase/sprint)
    const rel = getRelation(
      findProp(props, [
        'relation',
        'jour',
        'day',
        'module',
        'modules',
        'db modules',
        'db module',
      ])
    );
    const step: ActivityStep = { id: a.id, order, title, type, duration, url, instructions };
    for (const target of rel) {
      const list = relMap.get(target) ?? [];
      list.push(step);
      relMap.set(target, list);
    }
  }

  const dayEntries: DayEntry[] = dayPages.map((d) => {
    const props = d.properties;
    const title = getText(findProp(props, ['titre', 'title', 'name'])) ?? unitDb!.labels.singular;
    const order = getNum(findProp(props, ['ordre', 'order', 'index'])) ?? 1;
    const state = getSelect(findProp(props, ['etat', 'état', 'state', 'status'])) ?? null;
    const summary = getText(findProp(props, ['resume', 'résumé', 'summary', 'description'])) ?? null;
    const unlockDate = getDate(findProp(props, ['date_deblocage', 'unlock', 'date'])) ?? null;
    const unlockOffsetDays = getNum(findProp(props, ['decalage', 'décalage', 'offset', 'unlock_offset']));
    const slugBaseRaw = getText(findProp(props, ['slug'])) ?? `${unitDb!.slugPrefix}-${String(order).padStart(2, '0')}`;
    const slugBase = slugBaseRaw.toLowerCase();
    const slugPart = slugBase
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const slug = `${hubSlug}/${slugPart}`.replace(/\/{2,}/g, '/');
    // Keep only real steps in the wizard; exclude activities explicitly marked as "option"
    const steps = (relMap.get(d.id) ?? [])
      .filter((s) => {
        const t = normalize(s.type ?? '');
        if (!t) return true;
        // accept 'step', 'etape', 'intro', otherwise exclude 'option'
        if (/^(step|etape|étape|intro)/.test(t)) return true;
        if (/option/.test(t)) return false;
        return true;
      })
      .sort((a, b) => a.order - b.order);
    return {
      id: d.id,
      order,
      slug,
      title,
      summary,
      state,
      unlockDate,
      unlockOffsetDays,
      steps,
    } satisfies DayEntry;
  });

  dayEntries.sort((a, b) => a.order - b.order);
  return {
    days: dayEntries,
    kind: unitDb.kind,
    unitLabelSingular: unitDb.labels.singular,
    unitLabelPlural: unitDb.labels.plural,
  } satisfies LearningPath;
}

async function syncHubsInParallel(
  hubs: PageObjectResponse[],
  opts: { stats: SyncStats; force?: boolean }
): Promise<HubMeta[]> {
  if (!hubs.length) return [];
  const batches = chunkArray(hubs, 2);
  const results: HubMeta[] = [];

  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    const metas = await Promise.all(batch.map((hub) => syncHub(hub, opts)));
    results.push(...metas.filter(Boolean) as HubMeta[]);
    if (i < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Construit une structure de navigation hiérarchique à partir des blocks :
 * - Les callouts avec 📌 deviennent des sections
 * - Les child pages sont groupées sous leur section
 * Note: Les slugs seront ajoutés après la sync des child pages
 */
function buildNavigationStructure(
  blocks: NotionBlock[], 
  parentSlug: string
): NavItem[] {
  const navigation: NavItem[] = [];
  let currentSection: NavItem | null = null;
  
  console.log(`[buildNavigation] 🔍 Building navigation from ${blocks.length} blocks`);
  
  function traverse(blockList: NotionBlock[], depth = 0) {
    const indent = '  '.repeat(depth);
    
    for (const block of blockList) {
      // Détecter les callouts avec 📌 (punaise) comme sections
      if (block.type === 'callout') {
        const calloutBlock = block as Extract<NotionBlock, { type: 'callout' }>;
        const richTextArray = calloutBlock.callout?.rich_text || [];
        const text = richTextArray.map((rt: { plain_text: string }) => rt.plain_text).join('');
        const icon = calloutBlock.callout?.icon;
        const iconEmoji = icon && 'emoji' in icon ? icon.emoji : '';
        
        // Si le callout a l'emoji 📌, c'est une section
        if (iconEmoji === '📌') {
          console.log(`${indent}  ✅ Found section callout: "${text}"`);
          
          // Sauvegarder la section précédente si elle existe
          if (currentSection && currentSection.children && currentSection.children.length > 0) {
            navigation.push(currentSection);
          }
          
          // Créer une nouvelle section
          currentSection = {
            type: 'section',
            title: text,
            children: []
          };
        }
      }
      
      // Détecter les child pages
      if (block.type === 'child_page') {
        const childPageBlock = block as Extract<NotionBlock, { type: 'child_page' }>;
        const pageTitle = childPageBlock.child_page.title;
        const pageIconData = (childPageBlock as unknown as { child_page: { icon?: { type: string; emoji?: string; external?: { url?: string }; file?: { url?: string } } } }).child_page?.icon;
        let pageIcon: string | null = null;
        if (pageIconData) {
          if (pageIconData.type === 'emoji') pageIcon = pageIconData.emoji ?? null;
          else if (pageIconData.type === 'external') pageIcon = pageIconData.external?.url ?? null;
          else if (pageIconData.type === 'file') pageIcon = pageIconData.file?.url ?? null;
        }
        console.log(`${indent}  ✅ Found child page: "${pageTitle}"`);
        
        // Créer un slug pour cette child page
        const titleSlug = pageTitle
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove accents
          .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
          .replace(/\s+/g, '-') // Spaces to hyphens
          .replace(/-+/g, '-') // Multiple hyphens to single
          .replace(/^-|-$/g, ''); // Trim hyphens
        
        const fullSlug = `${parentSlug}/${titleSlug}`;
        
        // Ajouter à la section courante ou comme page standalone
        if (currentSection && currentSection.children) {
          currentSection.children.push({
            id: block.id,
            title: pageTitle,
            slug: fullSlug,
            icon: pageIcon
          });
        } else {
          // Page sans section
          navigation.push({
            type: 'page',
            title: pageTitle,
            id: block.id,
            slug: fullSlug,
            icon: pageIcon
          });
        }
      }
      
      // Parcourir les enfants
      const children = (block as AugmentedBlock).__children;
      if (children?.length) {
        traverse(children, depth + 1);
      }
    }
  }
  
  traverse(blocks);
  
  // Ajouter la dernière section si elle existe
  if (currentSection) {
    const section = currentSection as NavItem;
    if (section.children && section.children.length > 0) {
      navigation.push(section);
    }
  }
  
  console.log(`[buildNavigation] ✅ Built navigation with ${navigation.length} items`);
  navigation.forEach((item, idx) => {
    if (item.type === 'section' && item.children) {
      console.log(`  ${idx + 1}. Section: "${item.title}" (${item.children.length} pages)`);
    } else {
      console.log(`  ${idx + 1}. Page: "${item.title}"`);
    }
  });
  
  return navigation;
}

/**
 * Collecte tous les blocks child_page dans une arborescence de blocs
 */
function collectChildPageBlocks(blocks: NotionBlock[]): Array<{ id: string; title: string }> {
  const childPages: Array<{ id: string; title: string }> = [];
  
  console.log(`[collectChildPageBlocks] 🔍 Starting traversal of ${blocks.length} blocks`);
  
  function traverse(blockList: NotionBlock[], depth = 0) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}[traverse] Processing ${blockList.length} blocks at depth ${depth}`);
    
    for (const block of blockList) {
      console.log(`${indent}  - Block type: ${block.type}, id: ${block.id.substring(0, 8)}...`);
      
      if (block.type === 'child_page') {
        const childPageBlock = block as Extract<NotionBlock, { type: 'child_page' }>;
        console.log(`${indent}    ✅ Found child_page: "${childPageBlock.child_page.title}"`);
        childPages.push({
          id: block.id,
          title: childPageBlock.child_page.title
        });
      }
      
      const children = (block as AugmentedBlock).__children;
      if (children?.length) {
        console.log(`${indent}    📁 Block has ${children.length} children, traversing...`);
        traverse(children, depth + 1);
      }
    }
  }
  
  traverse(blocks);
  
  console.log(`[collectChildPageBlocks] ✅ Collected ${childPages.length} child pages`);
  return childPages;
}

/**
 * Synchronise les pages enfants (child_page) pour qu'elles soient accessibles individuellement
 * Par exemple: si la page "documentation" contient des child pages,
 * elles seront accessibles à "/documentation/getting-started", etc.
 * 
 * OPTIMISÉ: Synchronise séquentiellement avec délais pour respecter les rate limits
 */
async function syncChildPages(
  parentSlug: string,
  parentPageId: string,
  blocks: NotionBlock[],
  opts: SyncOptions,
  parentInfo?: {
    parentTitle: string;
    parentSlug: string;
    parentNavigation: NavItem[];
    maxDepth?: number;
    isHub?: boolean;
    hubDescription?: string | null;
    parentIcon?: string | null;
  }
) {
  try {
    const context = opts.childContext ?? { maxDepth: DEFAULT_CHILD_MAX_DEPTH, currentDepth: 1 };
    console.log(
      `[syncChildPages] 🔍 Syncing children at depth ${context.currentDepth}/${context.maxDepth} for "${parentSlug}"`
    );
    if (context.currentDepth > context.maxDepth) {
      console.log(
        `[syncChildPages] ⚠️  Depth limit reached for "${parentSlug}" (${context.currentDepth}/${context.maxDepth})`
      );
      return [];
    }

    console.log(`[syncChildPages] 🔍 Collecting child pages from ${blocks.length} blocks...`);
    const childPages = collectChildPageBlocks(blocks);
    
    console.log(`[syncChildPages] 📊 Found ${childPages.length} child pages`);
    if (childPages.length > 0) {
      console.log(`[syncChildPages] Child pages found:`, childPages.map(c => c.title));
    }
    
    if (!childPages.length) {
      console.log(`[syncChildPages] ⚠️  No child pages found for "${parentSlug}"`);
      return [];
    }
    
    console.log(`[sync] Found ${childPages.length} child pages in page "${parentSlug}"`);
    
    // Limiter le nombre de child pages pour éviter les timeouts
    const MAX_CHILD_PAGES = 10;
    const pagesToSync = childPages.slice(0, MAX_CHILD_PAGES);
    
    if (childPages.length > MAX_CHILD_PAGES) {
      console.warn(`[sync] Too many child pages (${childPages.length}), limiting to ${MAX_CHILD_PAGES}`);
    }
    
    const syncedChildren: Array<{ id: string; title: string; slug: string }> = [];
    
    // Synchroniser SÉQUENTIELLEMENT pour éviter les rate limits
    // Notion limite à 3 requêtes/seconde, donc on attend 400ms entre chaque
    const DELAY_MS = 400; // 400ms = 2.5 requêtes/seconde (sous la limite)
    
    for (const childPage of pagesToSync) {
      try {
        // Attendre avant chaque requête (sauf la première)
        if (syncedChildren.length > 0) {
          console.log(`[syncChildPages] ⏳ Waiting ${DELAY_MS}ms to respect Notion rate limits...`);
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
        
        console.log(`[syncChildPages] 🔄 Processing child page: ${childPage.title}`);
        
        const result = await (async () => {
          try {
            // Récupérer les métadonnées de la page enfant
            const childPageData = await getPage(childPage.id);
            
            if (!isFullPage(childPageData)) {
              console.warn(`[sync] Child page ${childPage.id} is not a full page`);
              return null;
            }
            
            // Créer un slug depuis le titre (kebab-case)
            const titleSlug = childPage.title
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') // Remove accents
              .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
              .replace(/\s+/g, '-') // Spaces to hyphens
              .replace(/-+/g, '-') // Multiple hyphens to single
              .replace(/^-|-$/g, ''); // Trim hyphens
            
            const fullSlug = `${parentSlug}/${titleSlug}`;
            
            console.log(`[sync] Syncing child page: ${fullSlug} (${childPage.title})`);
            
            // Créer un objet PageObjectResponse simulé
            const modifiedPage = structuredClone(childPageData) as PageObjectResponse;
            
            // Ajouter une propriété slug simulée
            if (!modifiedPage.properties.slug) {
              (modifiedPage.properties as Record<string, unknown>).slug = {
                type: 'rich_text',
                rich_text: [],
                id: 'slug'
              };
            }
            
            if ('rich_text' in modifiedPage.properties.slug) {
              modifiedPage.properties.slug.rich_text = [
                {
                  type: 'text' as const,
                  text: { content: fullSlug, link: null },
                  plain_text: fullSlug,
                  href: null,
                  annotations: {
                    bold: false,
                    italic: false,
                    strikethrough: false,
                    underline: false,
                    code: false,
                    color: 'default' as const,
                  },
                },
              ];
            }
            
            // Ajouter un titre si absent
            if (!modifiedPage.properties.Title) {
              (modifiedPage.properties as Record<string, unknown>).Title = {
                type: 'title',
                title: [],
                id: 'title'
              };
            }
            
            if ('title' in modifiedPage.properties.Title) {
              modifiedPage.properties.Title.title = [
                {
                  type: 'text' as const,
                  text: { content: childPage.title, link: null },
                  plain_text: childPage.title,
                  href: null,
                  annotations: {
                    bold: false,
                    italic: false,
                    strikethrough: false,
                    underline: false,
                    code: false,
                    color: 'default' as const,
                  },
                },
              ];
            }
            
            const targetMaxDepth = parentInfo?.maxDepth ?? context.maxDepth;
            const childPageContext: ChildContext = {
              maxDepth: targetMaxDepth,
              currentDepth: context.currentDepth,
            };

            const childMetaOverrides: Partial<PageBundle['meta']> = {};
            if (parentInfo) {
              childMetaOverrides.parentSlug = parentInfo.parentSlug;
              childMetaOverrides.parentTitle = parentInfo.parentTitle;
              childMetaOverrides.parentNavigation = parentInfo.parentNavigation;
              if (parentInfo.parentIcon) childMetaOverrides.parentIcon = parentInfo.parentIcon;
              if (parentInfo.isHub) childMetaOverrides.isHub = true;
            }

            await syncPage(modifiedPage, {
              type: 'page',
              stats: opts.stats,
              force: false,
              childContext: childPageContext,
              metaOverrides: Object.keys(childMetaOverrides).length ? childMetaOverrides : undefined,
            });
            
            // Ajouter les infos du parent dans le bundle de la child page
            if (parentInfo) {
              const childBundle = await getPageBundle(fullSlug);
              if (childBundle) {
                childBundle.meta.parentSlug = parentInfo.parentSlug;
                childBundle.meta.parentTitle = parentInfo.parentTitle;
                childBundle.meta.parentNavigation = parentInfo.parentNavigation;
                if (parentInfo.isHub) childBundle.meta.isHub = true;
                if (parentInfo.hubDescription && !childBundle.meta.description) {
                  childBundle.meta.description = parentInfo.hubDescription;
                }
                if (parentInfo.parentIcon) {
                  if (!childBundle.meta.parentIcon) {
                    childBundle.meta.parentIcon = parentInfo.parentIcon;
                  }
                  if (!childBundle.meta.icon) {
                    childBundle.meta.icon = parentInfo.parentIcon;
                  }
                }
                await setPageBundle(fullSlug, childBundle);
                console.log(`[syncChildPages] ✅ Added parent info to child page "${fullSlug}"`);
              }
            }
            
            await revalidatePath(`/${fullSlug}`, 'page');
            
            return {
              id: childPage.id,
              title: childPage.title,
              slug: fullSlug
            };
          } catch (error) {
            console.error(`[sync] Failed to sync child page ${childPage.title}:`, error);
            return null;
          }
        })();
        
        // Collecter le résultat
        if (result) {
          syncedChildren.push(result);
          opts.stats.childPagesSynced += 1;
          console.log(`[syncChildPages] ✅ Synced child page: ${result.title}`);
        }
      } catch (error) {
        console.error(`[syncChildPages] Error processing child page ${childPage.title}:`, error);
      }
    }
    
    return syncedChildren;
  } catch (error) {
    console.error(`[sync] Error syncing child pages for ${parentSlug}:`, error);
    return [];
  }
}

/**
 * Synchronise les pages enfants d'une database pour qu'elles soient accessibles individuellement
 * Par exemple: si la page "sprint" contient une database avec l'item "cas-client-adecco",
 * cette fonction va créer une page accessible à "/sprint/cas-client-adecco"
 */
async function syncDatabaseChildren(
  databaseId: string,
  parentSlug: string,
  opts: SyncOptions,
  parentInfo?: {
    parentTitle: string;
    parentSlug: string;
    parentNavigation: NavItem[];
    isHub?: boolean;
    hubDescription?: string | null;
    parentIcon?: string | null;
  }
) {
  try {
    const context = opts.childContext ?? { maxDepth: DEFAULT_CHILD_MAX_DEPTH, currentDepth: 1 };
    // Récupérer toutes les pages de la database
    const dbPages = await collectDatabasePages(databaseId);
    
    console.log(`[sync] Found ${dbPages.length} children in database ${databaseId} for parent "${parentSlug}"`);

    // Synchroniser SÉQUENTIELLEMENT avec délais pour éviter les rate limits
    const DELAY_MS = 400; // 400ms = 2.5 requêtes/seconde (sous la limite)
    let syncedCount = 0;

    for (const dbPage of dbPages) {
      // Attendre avant chaque requête (sauf la première)
      if (syncedCount > 0) {
        console.log(`[syncDatabaseChildren] ⏳ Waiting ${DELAY_MS}ms to respect Notion rate limits...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }

      // Extraire le slug de la page enfant
      const childSlugRaw = firstRichText(dbPage.properties.slug);
      if (!childSlugRaw) {
        console.warn(`[sync] Skipping database child ${dbPage.id} - no slug property`);
        continue;
      }

      // Construire le slug complet
      // Si le slug commence déjà par le parent (ex: "/sprint/cas-client"), l'utiliser tel quel
      // Sinon, le combiner avec le parent
      let fullSlug: string;
      if (childSlugRaw.startsWith('/')) {
        // Le slug est absolu (ex: "/sprint/cas-client-adecco")
        fullSlug = childSlugRaw.substring(1); // Enlever le "/" initial
      } else if (childSlugRaw.includes('/')) {
        // Le slug contient déjà le chemin (ex: "sprint/cas-client-adecco")
        fullSlug = childSlugRaw;
      } else {
        // Le slug est relatif (ex: "cas-client-adecco"), le combiner avec le parent
        fullSlug = `${parentSlug}/${childSlugRaw}`;
      }

      console.log(`[sync] Syncing database child: ${fullSlug} (page ${dbPage.id})`);

      // Synchroniser la page enfant comme une page normale
      try {
        // Créer un objet page modifié avec le slug complet
        const modifiedPage = structuredClone(dbPage);
        
        // Mettre à jour la propriété slug pour qu'elle reflète le chemin complet
        if (modifiedPage.properties.slug && 'rich_text' in modifiedPage.properties.slug) {
          modifiedPage.properties.slug.rich_text = [
            {
              type: 'text' as const,
              text: { content: fullSlug, link: null },
              plain_text: fullSlug,
              href: null,
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: 'default' as const,
              },
            },
          ];
        }

        await syncPage(modifiedPage, {
          type: 'page',
          stats: opts.stats,
          force: opts.force,
          childContext: context,
        });
        if (parentInfo) {
          const childBundle = await getPageBundle(fullSlug);
          if (childBundle) {
            childBundle.meta.parentSlug = parentInfo.parentSlug;
            childBundle.meta.parentTitle = parentInfo.parentTitle;
            childBundle.meta.parentNavigation = parentInfo.parentNavigation;
            if (parentInfo.isHub) childBundle.meta.isHub = true;
            if (parentInfo.hubDescription && !childBundle.meta.description) {
              childBundle.meta.description = parentInfo.hubDescription;
            }
            if (parentInfo.parentIcon) {
              if (!childBundle.meta.parentIcon) {
                childBundle.meta.parentIcon = parentInfo.parentIcon;
              }
              if (!childBundle.meta.icon) {
                childBundle.meta.icon = parentInfo.parentIcon;
              }
            }
            await setPageBundle(fullSlug, childBundle);
          }
        }
        opts.stats.databaseChildrenSynced += 1;
        syncedCount += 1;
        
        // Revalider le chemin de la page enfant
        await revalidatePath(`/${fullSlug}`, 'page');
        console.log(`[syncDatabaseChildren] ✅ Synced database child: ${fullSlug}`);
      } catch (error) {
        console.error(`[sync] Failed to sync database child ${fullSlug}:`, error);
      }
    }
    
    console.log(`[syncDatabaseChildren] ✅ Total database children synced: ${syncedCount}`);
  } catch (error) {
    const err = error as { status?: number; code?: string; message?: string };
    // Si on n'a pas accès à la database, on log juste l'erreur sans bloquer
    if (err?.status === 404 || err?.code === 'object_not_found') {
      console.warn(`[sync] Cannot access database ${databaseId} for syncing children`);
    } else {
      console.error(`[sync] Error syncing database children for ${databaseId}:`, error);
    }
  }
}

/**
 * Fonction principale de synchronisation
 * Exportée pour être utilisée par le worker QStash
 */
export async function runFullSync(force: boolean = false) {
  if (!PAGES_DB || !POSTS_DB || !HUBS_DB) {
    throw new Error('Missing Notion database env vars');
  }

  const syncedPages: string[] = [];
  const hubsIndex: HubMeta[] = [];
  const postsIndex: PostMeta[] = [];
  const stats: SyncStats = {
    imageMirrored: 0,
    imageFallbacks: [],
    missingBlocks: new Set<string>(),
    recordMapPages: 0,
    buttonsConverted: 0,
    buttonSources: [],
    unsupportedBlocks: [],
    databaseChildrenSynced: 0,
    childPagesSynced: 0,
    pagesSkipped: 0,
    hubsSynced: 0,
    workshopsSynced: 0,
    sprintsSynced: 0,
  };
  const startedAt = Date.now();
  let hubsProcessed = 0;
  let pagesProcessed = 0;
  let postsProcessed = 0;

  const [hubs, pages, posts] = await Promise.all([
    collectDatabasePages(HUBS_DB),
    collectDatabasePages(PAGES_DB),
    collectDatabasePages(POSTS_DB),
  ]);

  const [workshopsInput, sprintsInput] = await Promise.all([
    collectDatabasePagesSafe(WORKSHOPS_DB, 'workshops'),
    collectDatabasePagesSafe(SPRINTS_DB, 'sprints'),
  ]);

  hubsProcessed = hubs.length;
  pagesProcessed = pages.length;
  postsProcessed = posts.length;

  const hubMap = new Map<string, HubReference>();
  for (const hub of hubs) {
    const slug = firstRichText(findPropByName(hub.properties, ['slug'])) ?? null;
    const title = extractTitle(findTitleProperty(hub.properties));
    if (!slug) continue;
    const info: HubReference = { slug, title, notionId: hub.id };
    hubMap.set(hub.id, info);
    const canonical = canonicalId(hub.id);
    if (canonical) hubMap.set(canonical, info);
  }

  if (hubs.length) {
    console.log('[sync] 🚀 Phase 1: Syncing hubs...');
    const hubMetas = await syncHubsInParallel(hubs, { stats, force });
    hubsIndex.push(...hubMetas);
    if (hubMetas.length) {
      hubMetas.forEach((meta) => syncedPages.push(meta.slug));
    }
  } else {
    console.log('[sync] 🚀 Phase 1: No hubs to sync.');
  }

  for (const page of pages) {
    const meta = await syncPage(page, { type: 'page', stats, force });
    if (meta) {
      syncedPages.push(meta.slug);
    }
  }

  for (const post of posts) {
    const meta = await syncPage(post, { type: 'post', stats, force });
    if (meta) {
      const postExcerpt = firstRichText(post.properties.excerpt);
      postsIndex.push({
        slug: meta.slug,
        title: meta.title,
        excerpt: postExcerpt,
        notionId: meta.notionId,
        cover: meta.cover ?? null,
        lastEdited: meta.lastEdited,
      });
    }
  }

  if (WORKSHOPS_DB) {
    await syncWorkshops({ stats, force }, hubMap, workshopsInput);
  }
  if (SPRINTS_DB) {
    await syncSprints({ stats, force }, sprintsInput);
  }

  await setHubsIndex({ items: hubsIndex, syncedAt: new Date().toISOString() });
  await revalidateTag('hubs:index');
  await revalidatePath('/hubs', 'page');

  await setPostsIndex({ items: postsIndex, syncedAt: new Date().toISOString() });
  await revalidateTag('posts:index');
  await revalidatePath('/blog', 'page');

  const durationMs = Date.now() - startedAt;
  const summary = {
    durationMs,
    hubsProcessed,
    hubsSynced: hubsIndex.length,
    pagesProcessed,
    pagesSynced: syncedPages.length,
    pagesSkipped: stats.pagesSkipped,
    postsProcessed,
    postsSynced: postsIndex.length,
    workshopsSynced: stats.workshopsSynced,
    sprintsSynced: stats.sprintsSynced,
    databaseChildrenSynced: stats.databaseChildrenSynced,
    childPagesSynced: stats.childPagesSynced,
    imageMirrored: stats.imageMirrored,
    imageFallbacks: stats.imageFallbacks.length,
    missingBlocks: Array.from(stats.missingBlocks),
    recordMapPages: stats.recordMapPages,
    buttonsConverted: stats.buttonsConverted,
    unsupportedBlocks: stats.unsupportedBlocks,
  };

  console.info('[sync] summary', summary);

  return {
    ok: true,
    synced: syncedPages.length,
    posts: postsIndex.length,
    hubs: hubsIndex.length,
    metrics: summary,
    imageFallbackSamples: stats.imageFallbacks.slice(0, 10),
  };
}

/**
 * Targeted sync for a single slug (hub/page/post).
 * Attempts hub first, then standard pages, then posts.
 */
export async function runSyncOne(slug: string, force: boolean = false) {
  if (!PAGES_DB || !POSTS_DB || !HUBS_DB) {
    throw new Error('Missing Notion database env vars');
  }

  const stats: SyncStats = {
    imageMirrored: 0,
    imageFallbacks: [],
    missingBlocks: new Set<string>(),
    recordMapPages: 0,
    buttonsConverted: 0,
    buttonSources: [],
    unsupportedBlocks: [],
    databaseChildrenSynced: 0,
    childPagesSynced: 0,
    pagesSkipped: 0,
    hubsSynced: 0,
    workshopsSynced: 0,
    sprintsSynced: 0,
  };
  const startedAt = Date.now();
  const normalized = slug.replace(/^\//, '');

  const findBySlug = async (dbId: string) => {
    const res = await queryDb(dbId, { page_size: 2, filter: { property: 'slug', rich_text: { equals: normalized } } });
    return res.results.find(isFullPage) as PageObjectResponse | undefined;
  };

  // Try hub
  let processedType: 'hub' | 'page' | 'post' | 'none' = 'none';
  const hub = await findBySlug(HUBS_DB);
  if (hub) {
    await syncHub(hub, { stats, force });
    processedType = 'hub';
  } else {
    const page = await findBySlug(PAGES_DB);
    if (page) {
      await syncPage(page, { type: 'page', stats, force });
      processedType = 'page';
    } else {
      const post = await findBySlug(POSTS_DB);
      if (post) {
        await syncPage(post, { type: 'post', stats, force });
        processedType = 'post';
      }
    }
  }

  const durationMs = Date.now() - startedAt;
  const summary = {
    durationMs,
    processedType,
    workshopsSynced: stats.workshopsSynced,
    sprintsSynced: stats.sprintsSynced,
    databaseChildrenSynced: stats.databaseChildrenSynced,
    childPagesSynced: stats.childPagesSynced,
    imageMirrored: stats.imageMirrored,
    imageFallbacks: stats.imageFallbacks.length,
    recordMapPages: stats.recordMapPages,
    buttonsConverted: stats.buttonsConverted,
  };

  return {
    ok: true,
    slug: normalized,
    processedType,
    metrics: summary,
  };
}

/**
 * Targeted sync for a single sprint by slug (partial update, merges index).
 */
export async function runSyncSprintOne(slug: string, force: boolean = false) {
  if (!SPRINTS_DB) {
    throw new Error('Missing NOTION_SPRINTS_DB env var');
  }

  const stats: SyncStats = {
    imageMirrored: 0,
    imageFallbacks: [],
    missingBlocks: new Set<string>(),
    recordMapPages: 0,
    buttonsConverted: 0,
    buttonSources: [],
    unsupportedBlocks: [],
    databaseChildrenSynced: 0,
    childPagesSynced: 0,
    pagesSkipped: 0,
    hubsSynced: 0,
    workshopsSynced: 0,
    sprintsSynced: 0,
  };

  const startedAt = Date.now();
  const normalized = slug.replace(/^\//, '');

  // Find sprint page by slug
  const res = await queryDb(SPRINTS_DB, {
    page_size: 1,
    filter: { property: 'slug', rich_text: { equals: normalized } },
  });
  const page = res.results.find(isFullPage) as PageObjectResponse | undefined;
  if (!page) {
    return { ok: false, notFound: true, slug: normalized } as const;
  }

  await syncSprints({ stats, force }, [page]);

  // Sync the associated Notion page (if exists) so the sprint page can render Blocks + sidebar
  try {
    await runSyncOne(`sprint/${normalized}`, force);
  } catch {
    // Ignore if page does not exist; sprint page will still render modules
  }

  const durationMs = Date.now() - startedAt;
  const summary = {
    durationMs,
    sprintsSynced: stats.sprintsSynced,
    databaseChildrenSynced: stats.databaseChildrenSynced,
    childPagesSynced: stats.childPagesSynced,
    imageMirrored: stats.imageMirrored,
    imageFallbacks: stats.imageFallbacks.length,
  };

  return {
    ok: true,
    slug: normalized,
    metrics: summary,
  } as const;
}

export async function GET(request: Request) {
  if (!CRON_SECRET) {
    return NextResponse.json({ message: 'Missing CRON_SECRET' }, { status: 500 });
  }
  if (!PAGES_DB || !POSTS_DB) {
    return NextResponse.json({ message: 'Missing Notion database env vars' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const force = searchParams.get('force') === '1' || searchParams.get('force') === 'true';

  if (secret !== CRON_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runFullSync(force);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[sync] Fatal error:', error);
    await notifySyncFailure({
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ message: 'Sync failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
