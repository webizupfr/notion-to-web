import 'server-only';

import { kv } from '@vercel/kv';

import type { NotionBlock } from '@/lib/notion';
import type { DbBundle } from '@/lib/db-render';
import type { PageMeta, PostMeta } from '@/lib/types';

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
  viewId?: string | null;
  cursor: string;
  bundle: DbBundle;
  syncedAt: string;
};

export type PostsIndex = {
  items: PostMeta[];
  syncedAt: string;
};

function hasKv(): boolean {
  return Boolean(process.env.KV_REST_API_URL || process.env.KV_URL);
}

function pageKey(slug: string) {
  return `page:${slug}`;
}

const VIEW_ID_REGEX = /^[0-9a-fA-F]{32}$/;

function normalizeViewKey(value?: string | null): string {
  if (!value) return '_';
  const trimmed = value.trim();
  if (!trimmed) return '_';
  if (VIEW_ID_REGEX.test(trimmed)) {
    return trimmed
      .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5')
      .toLowerCase();
  }
  return trimmed;
}

function dbKey(databaseId: string, viewId = '_', cursor = '_') {
  return `db:${databaseId}:view:${normalizeViewKey(viewId)}:cursor:${cursor}`;
}

function legacyDbKey(databaseId: string, cursor = '_') {
  return `db:${databaseId}:cursor:${cursor}`;
}

const postsIndexKey = 'posts:index';

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

export async function getDbBundleFromCache(
  databaseId: string,
  viewId = '_',
  cursor = '_'
): Promise<DbCacheEntry | null> {
  if (!hasKv()) return null;
  try {
    const key = dbKey(databaseId, viewId || '_', cursor);
    const entry = await kv.get<DbCacheEntry>(key);
    if (entry) return entry;

    // Fallback to default view when specific view cache miss
    if ((viewId ?? '_') !== '_') {
      const defaultEntry = await kv.get<DbCacheEntry>(dbKey(databaseId, '_', cursor));
      if (defaultEntry) return defaultEntry;
    }

    // Legacy key without view dimension
    const legacy = await kv.get<DbCacheEntry>(legacyDbKey(databaseId, cursor));
    return legacy ?? null;
  } catch (error) {
    console.error('KV getDbBundle failed', error);
    return null;
  }
}

export async function setDbBundleCache(entry: DbCacheEntry) {
  if (!hasKv()) return;
  const viewKey = normalizeViewKey(entry.viewId ?? null);
  await kv.set(dbKey(entry.databaseId, viewKey, entry.cursor), entry);
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
