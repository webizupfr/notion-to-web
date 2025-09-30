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

function dbKey(databaseId: string, cursor = '_') {
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
