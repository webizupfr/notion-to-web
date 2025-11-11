import 'server-only';

import type { QueryDatabaseParameters, PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

import { queryDb } from '@/lib/notion';
import { cacheGet, cacheSet } from '@/lib/cache';
import type { CohortMeta, DayEntry, LearningPath } from '@/lib/types';

const COHORTS_DB = process.env.NOTION_COHORTS_DB;
const DEFAULT_TZ = 'Europe/Paris';
const CACHE_TTL = 60 * 1000;

type MaybeCohort = CohortMeta | null;

const slugCacheKey = (slug: string) => `cohort:slug:${slug}`;
const hubCacheKey = (hubId: string) => `cohort:hub:${hubId}`;

function isFullPage(page: unknown): page is PageObjectResponse {
  return typeof page === 'object' && page !== null && (page as { object?: string }).object === 'page';
}

function getRichText(property: PageObjectResponse['properties'][string] | undefined): string | null {
  if (!property) return null;
  if (property.type === 'rich_text') {
    const segment = property.rich_text?.[0]?.plain_text ?? '';
    return segment ? segment.trim() : null;
  }
  if (property.type === 'title') {
    const segment = property.title?.[0]?.plain_text ?? '';
    return segment ? segment.trim() : null;
  }
  return null;
}

function getSelect(property: PageObjectResponse['properties'][string] | undefined): string | null {
  if (!property) return null;
  if (property.type === 'select') return property.select?.name ?? null;
  return null;
}

function getDate(property: PageObjectResponse['properties'][string] | undefined): string | null {
  if (!property) return null;
  if (property.type === 'date') return property.date?.start ?? null;
  return null;
}

function getRelationId(property: PageObjectResponse['properties'][string] | undefined): string | null {
  if (!property || property.type !== 'relation') return null;
  const rel = property.relation?.[0];
  return rel?.id ?? null;
}

function normalize(text: string | null | undefined): string {
  return (text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function findProp(
  properties: PageObjectResponse['properties'],
  names: string[]
): PageObjectResponse['properties'][string] | undefined {
  const keys = Object.keys(properties ?? {});
  const normalized = keys.map((k) => ({ k, n: normalize(k) }));
  for (const want of names) {
    const wn = normalize(want);
    const hit = normalized.find((x) => x.n.includes(wn));
    if (hit) return properties[hit.k];
  }
  return undefined;
}

function toScheduleMode(value: string | null | undefined): 'relative' | 'absolute' {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized === 'absolute' ? 'absolute' : 'relative';
}

function parseCohort(page: PageObjectResponse): CohortMeta | null {
  const properties = page.properties ?? {};
  const slug = getRichText(findProp(properties, ['slug'])) ?? null;
  if (!slug) return null;

  const hubNotionId = getRelationId(findProp(properties, ['hub'])) ?? '';
  if (!hubNotionId) return null;

  const startDate = getDate(
    findProp(properties, ['start_date', 'start date', 'debut', 'début', 'start'])
  ) ?? null;
  const timezone = getSelect(findProp(properties, ['timezone', 'time zone', 'tz'])) ?? DEFAULT_TZ;
  const visibility = (getSelect(findProp(properties, ['visibility', 'visibilite', 'visibilité'])) ?? 'public')
    .toLowerCase() as CohortMeta['visibility'];
  const password = getRichText(findProp(properties, ['password', 'mot de passe', 'key', 'clé']));
  const scheduleMode = toScheduleMode(
    getSelect(findProp(properties, ['schedule_mode', 'planning', 'mode', 'schedule']))
  );
  const unitLabelSingular = getRichText(
    findProp(properties, ['unit_label_singular', 'unit singular', 'label', 'unite', 'unité'])
  );
  const unitLabelPlural = getRichText(
    findProp(properties, ['unit_label_plural', 'unit plural', 'labels', 'unites', 'unités'])
  );
  const endDate = getDate(findProp(properties, ['end_date', 'end date', 'fin', 'end'])) ?? null;

  if (!startDate) return null;

  return {
    slug,
    hubNotionId,
    startDate,
    endDate,
    timezone: timezone || DEFAULT_TZ,
    visibility: visibility === 'private' ? 'private' : 'public',
    password,
    scheduleMode,
    unitLabelSingular,
    unitLabelPlural,
  } satisfies CohortMeta;
}

async function queryCohortes(params: QueryDatabaseParameters): Promise<PageObjectResponse[]> {
  if (!COHORTS_DB) return [];
  const response = await queryDb(COHORTS_DB, params);
  return response.results.filter(isFullPage);
}

export async function getCohortBySlug(slug: string): Promise<CohortMeta | null> {
  if (!slug || !COHORTS_DB) return null;
  const cacheKey = slugCacheKey(slug);
  const cached = cacheGet<MaybeCohort>(cacheKey);
  if (cached !== null && cached !== undefined) {
    return cached;
  }

  const pages = await queryCohortes({
    database_id: COHORTS_DB,
    page_size: 2,
    filter: { property: 'slug', rich_text: { equals: slug } },
  });
  let cohort = pages.map(parseCohort).find(Boolean) ?? null;

  // Fallback: broader query then filter client-side if strict filter fails (property name/type mismatch)
  if (!cohort) {
    try {
      const all = await queryCohortes({ database_id: COHORTS_DB, page_size: 100 });
      cohort = all.map(parseCohort).find((c) => (c?.slug ?? '').toLowerCase() === slug.toLowerCase()) ?? null;
    } catch {}
  }

  cacheSet(cacheKey, cohort, CACHE_TTL);
  return cohort;
}

export async function listCohortsForHub(hubNotionId: string): Promise<CohortMeta[]> {
  if (!hubNotionId || !COHORTS_DB) return [];
  const cacheKey = hubCacheKey(hubNotionId);
  const cached = cacheGet<CohortMeta[]>(cacheKey);
  if (cached) return cached;

  const pages = await queryCohortes({
    database_id: COHORTS_DB,
    filter: {
      property: 'hub',
      relation: { contains: hubNotionId },
    },
    page_size: 100,
  });

  const cohorts = pages.map(parseCohort).filter((item): item is CohortMeta => Boolean(item));
  cacheSet(cacheKey, cohorts, CACHE_TTL);
  return cohorts;
}

function toDateKey(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dateKeyToIso(key: string): string {
  return `${key}T00:00:00.000Z`;
}

function addDays(base: Date, days: number): Date {
  const copy = new Date(base.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function nowInTimezone(timezone: string): { key: string; iso: string } {
  const now = new Date();
  const key = toDateKey(now, timezone || DEFAULT_TZ);
  return { key, iso: dateKeyToIso(key) };
}

function computeRelativeDate(cohort: CohortMeta, day: DayEntry, fallbackOrder: number): string {
  const base = new Date(cohort.startDate);
  const offset = Number.isFinite(day.unlockOffsetDays)
    ? (day.unlockOffsetDays as number)
    : Math.max(0, fallbackOrder - 1);
  const target = addDays(base, offset);
  const key = toDateKey(target, cohort.timezone || DEFAULT_TZ);
  return dateKeyToIso(key);
}

export function applyCohortOverlay(path: LearningPath | null | undefined, cohort: CohortMeta | null): LearningPath | null {
  if (!path || !cohort) return path ?? null;

  const scheduleMode = cohort.scheduleMode ?? 'relative';

  const days = path.days.map((day) => {
    const fallbackOrder = Number.isFinite(day.order) ? day.order : 1;
    let unlockDate = day.unlockDate ?? null;

    if (scheduleMode === 'absolute') {
      if (!unlockDate) {
        unlockDate = computeRelativeDate(cohort, day, fallbackOrder);
      }
    } else {
      unlockDate = computeRelativeDate(cohort, day, fallbackOrder);
    }

    return {
      ...day,
      unlockDate,
    } satisfies DayEntry;
  });

  return {
    ...path,
    days,
    kind: path.kind,
    unitLabelSingular: cohort.unitLabelSingular ?? path.unitLabelSingular,
    unitLabelPlural: cohort.unitLabelPlural ?? path.unitLabelPlural,
  } satisfies LearningPath;
}
