import 'server-only';

import { kv } from '@vercel/kv';

import type { NotionBlock } from '@/lib/notion';
import type { DbBundle } from '@/lib/db-render';
import type {
  PageMeta,
  PostMeta,
  HubMeta,
  DayEntry,
  NavItem,
  WorkshopSettings,
  SprintSettings,
  ModuleSettings,
} from '@/lib/types';

export type PageBundle = {
  meta: PageMeta & {
    lastEdited: string;
    icon?: string | null;
    cover?: string | null;
  };
  blocks: NotionBlock[];
  syncedAt: string;
};

export type DbCacheEntry = {
  databaseId: string;
  cursor: string;
  bundle: DbBundle;
  syncedAt: string;
};

export type PostsIndex = {
  items: PostMeta[];
  syncedAt: string;
};

export type HubsIndex = {
  items: HubMeta[];
  syncedAt: string;
};

export type WorkshopBundle = {
  slug: string;
  title: string;
  description?: string | null;
  visibility: 'public' | 'private';
  password?: string | null;
  derivedHub: {
    slug: string;
    title: string;
    notionId: string;
  };
  days: DayEntry[];
  settings?: WorkshopSettings | null;
  syncedAt: string;
};

export type WorkshopsIndex = {
  items: Array<{ slug: string; title: string; visibility: 'public' | 'private'; hubSlug: string }>;
  syncedAt: string;
};

export type SprintActivity = {
  slug: string;
  title: string;
  notionId: string;
  type?: string | null;
  duration?: number | null;
  summary?: string | null;
  tags?: string[];
  widgetYaml?: string | null;
  order?: number | null;
};

export type SprintModule = {
  slug: string;
  title: string;
  order: number;
  dayIndex?: number | null;
  description?: string | null;
  duration?: number | null;
  tags?: string[];
  isLocked: boolean;
  unlockAtISO?: string | null;
  settings?: ModuleSettings | null;
  activities?: SprintActivity[];
};

export type SprintBundle = {
  slug: string;
  title: string;
  description?: string | null;
  visibility: 'public' | 'private';
  password?: string | null;
  timezone: string;
  settings?: SprintSettings | null;
  modules: SprintModule[];
  contextBlocks?: NotionBlock[] | null;
  contextNavigation?: NavItem[] | null;
  contextNotionId?: string | null;
  syncedAt: string;
};

export type SprintsIndex = {
  items: Array<{ slug: string; title: string; visibility: 'public' | 'private'; timezone: string }>;
  syncedAt: string;
};

function hasKv(): boolean {
  return Boolean(process.env.KV_REST_API_URL || process.env.KV_URL);
}

function pageKey(slug: string) {
  return `page:${slug}`;
}

function dbKey(databaseId: string, cursor = '_') {
  return `db:${databaseId}:cursor:${cursor}`;
}

const postsIndexKey = 'posts:index';
const hubsIndexKey = 'hubs:index';
const workshopIndexKey = 'workshops:index';
const sprintIndexKey = 'sprints:index';

function workshopKey(slug: string) {
  return `workshop:${slug}`;
}

function sprintKey(slug: string) {
  return `sprint:${slug}`;
}

export async function getPageBundle(slug: string): Promise<PageBundle | null> {
  if (!hasKv()) return null;
  try {
    const data = await kv.get<PageBundle>(pageKey(slug));
    return data ?? null;
  } catch (error) {
    console.error('KV getPageBundle failed', error);
    return null;
  }
}

export async function setPageBundle(slug: string, bundle: PageBundle) {
  if (!hasKv()) return;
  await kv.set(pageKey(slug), bundle);
}

export async function getDbBundleFromCache(databaseId: string, cursor = '_'): Promise<DbCacheEntry | null> {
  if (!hasKv()) return null;
  try {
    return (await kv.get<DbCacheEntry>(dbKey(databaseId, cursor))) ?? null;
  } catch (error) {
    console.error('KV getDbBundle failed', error);
    return null;
  }
}

export async function setDbBundleCache(entry: DbCacheEntry) {
  if (!hasKv()) return;
  await kv.set(dbKey(entry.databaseId, entry.cursor), entry);
}

export async function getPostsIndex(): Promise<PostsIndex | null> {
  if (!hasKv()) return null;
  try {
    return (await kv.get<PostsIndex>(postsIndexKey)) ?? null;
  } catch (error) {
    console.error('KV getPostsIndex failed', error);
    return null;
  }
}

export async function setPostsIndex(index: PostsIndex) {
  if (!hasKv()) return;
  await kv.set(postsIndexKey, index);
}

export async function deletePost(slug: string) {
  if (!hasKv()) return;
  await kv.del(pageKey(slug));
}

export async function getHubsIndex(): Promise<HubsIndex | null> {
  if (!hasKv()) return null;
  try {
    return (await kv.get<HubsIndex>(hubsIndexKey)) ?? null;
  } catch (error) {
    console.error('KV getHubsIndex failed', error);
    return null;
  }
}

export async function setHubsIndex(index: HubsIndex) {
  if (!hasKv()) return;
  await kv.set(hubsIndexKey, index);
}

export async function getWorkshopBundle(slug: string): Promise<WorkshopBundle | null> {
  if (!hasKv()) return null;
  try {
    return (await kv.get<WorkshopBundle>(workshopKey(slug))) ?? null;
  } catch (error) {
    console.error('KV getWorkshopBundle failed', error);
    return null;
  }
}

export async function setWorkshopBundle(bundle: WorkshopBundle) {
  if (!hasKv()) return;
  await kv.set(workshopKey(bundle.slug), bundle);
}

export async function getWorkshopsIndex(): Promise<WorkshopsIndex | null> {
  if (!hasKv()) return null;
  try {
    return (await kv.get<WorkshopsIndex>(workshopIndexKey)) ?? null;
  } catch (error) {
    console.error('KV getWorkshopsIndex failed', error);
    return null;
  }
}

export async function setWorkshopsIndex(index: WorkshopsIndex) {
  if (!hasKv()) return;
  await kv.set(workshopIndexKey, index);
}

export async function getSprintBundle(slug: string): Promise<SprintBundle | null> {
  if (!hasKv()) return null;
  try {
    return (await kv.get<SprintBundle>(sprintKey(slug))) ?? null;
  } catch (error) {
    console.error('KV getSprintBundle failed', error);
    return null;
  }
}

export async function setSprintBundle(bundle: SprintBundle) {
  if (!hasKv()) return;
  await kv.set(sprintKey(bundle.slug), bundle);
}

export async function getSprintsIndex(): Promise<SprintsIndex | null> {
  if (!hasKv()) return null;
  try {
    return (await kv.get<SprintsIndex>(sprintIndexKey)) ?? null;
  } catch (error) {
    console.error('KV getSprintsIndex failed', error);
    return null;
  }
}

export async function setSprintsIndex(index: SprintsIndex) {
  if (!hasKv()) return;
  await kv.set(sprintIndexKey, index);
}
