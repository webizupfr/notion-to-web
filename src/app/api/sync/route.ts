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
import {
  getPageBundle,
  setPageBundle,
  setDbBundleCache,
  setPostsIndex,
  type PageBundle,
} from '@/lib/content-store';
import type { PageMeta, PostMeta } from '@/lib/types';
import type { DbBundle } from '@/lib/db-render';
import { fetchDatabaseBundle } from '@/lib/db-render';
import { resolveDatabaseIdFromBlock, type LinkedDatabaseBlock } from '@/lib/resolve-db-id';

export const runtime = 'nodejs';

const PAGES_DB = process.env.NOTION_PAGES_DB;
const POSTS_DB = process.env.NOTION_POSTS_DB;
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

async function syncPage(
  page: PageObjectResponse,
  opts: { type: 'page' | 'post'; stats: SyncStats; force?: boolean }
) {
  const slug = firstRichText(page.properties.slug);
  if (!slug) return null;

  const title = extractTitle(page.properties.Title);
  const visibility = (selectValue(page.properties.visibility) as PageMeta['visibility']) ?? 'public';
  const password = firstRichText(page.properties.password);

  const metaInfo = await getPageMeta(page.id);
  const existing = await getPageBundle(slug);
  if (!opts.force && existing && existing.meta.lastEdited === metaInfo.lastEdited) {
    return existing.meta;
  }

  const blocks = await pageBlocksDeep(page.id, 100, {
    onMissingBlock: (id) => opts.stats.missingBlocks.add(id),
  });
  const processedBlocks = await processBlocksMedia(blocks, {
    slug,
    pageId: page.id,
    stats: opts.stats,
  });

  const recordMap = await fetchRecordMap(page.id);
  if (recordMap) {
    const hints = extractHints(recordMap);
    console.log('[recordMap] hints', {
      columns: Object.keys(hints.columns).length,
      images: Object.keys(hints.images).length,
      buttons: Object.keys(hints.buttons).length,
    });

    if (Object.keys(hints.columns).length) {
      for (const listBlock of processedBlocks) {
        if (listBlock.type !== 'column_list') continue;
        const columns = getBlockChildren(listBlock);
        const ratios: number[] = [];
        let hasExplicit = false;

        for (const column of columns) {
          const hint = hints.columns[column.id];
          if (hint?.ratio !== undefined) {
            ratios.push(Math.max(Number(hint.ratio) || 0.01, 0.01));
            hasExplicit = true;
          } else {
            ratios.push(1);
          }
        }

        if (!hasExplicit) {
          const widthHints = columns.map((column) => hints.columns[column.id]?.widthPx ?? 0);
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
          const hint = hints.images[block.id];
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
          const hint = hints.buttons[block.id];
          if (hint) {
            const augmented = block as unknown as Record<string, unknown>;
            augmented.type = 'button';
            augmented.button = hint;
            return;
          }
        }
        const children = (block as { __children?: NotionBlock[] }).__children;
        children?.forEach(applyButtonHints);
      };
      processedBlocks.forEach(applyButtonHints);
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

  let fullWidth = false;
  try {
    const raw = (await getPage(page.id)) as unknown as {
      full_width?: boolean;
      page_full_width?: boolean;
      is_full_width?: boolean;
    };
    fullWidth = Boolean(raw.full_width ?? raw.page_full_width ?? raw.is_full_width ?? false);
  } catch {
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

  const linkedDbIds = await collectLinkedDatabaseIds(blocks);
  for (const databaseId of linkedDbIds) {
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
  }

  return meta;
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

  const syncedPages: string[] = [];
  const postsIndex: PostMeta[] = [];
  const stats: SyncStats = {
    imageMirrored: 0,
    imageFallbacks: [],
    missingBlocks: new Set<string>(),
  };
  const startedAt = Date.now();
  let pagesProcessed = 0;
  let postsProcessed = 0;

  try {
    const [pages, posts] = await Promise.all([
      collectDatabasePages(PAGES_DB),
      collectDatabasePages(POSTS_DB),
    ]);

    pagesProcessed = pages.length;
    postsProcessed = posts.length;

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
        });
      }
    }

    await setPostsIndex({ items: postsIndex, syncedAt: new Date().toISOString() });
    await revalidateTag('posts:index');
    await revalidatePath('/blog', 'page');

    const durationMs = Date.now() - startedAt;
    const summary = {
      durationMs,
      pagesProcessed,
      pagesSynced: syncedPages.length,
      postsProcessed,
      postsSynced: postsIndex.length,
      imageMirrored: stats.imageMirrored,
      imageFallbacks: stats.imageFallbacks.length,
      missingBlocks: Array.from(stats.missingBlocks),
    };

    console.info('[sync] summary', summary);

    const fallbackSamples = stats.imageFallbacks.slice(0, 10);

    return NextResponse.json({
      ok: true,
      synced: syncedPages.length,
      posts: postsIndex.length,
      metrics: summary,
      imageFallbackSamples: fallbackSamples,
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error('Sync error', error);
    await notifySyncFailure({
      error: error instanceof Error ? error.message : String(error),
      durationMs,
      imageFallbacks: stats.imageFallbacks.slice(0, 10),
      missingBlocks: Array.from(stats.missingBlocks),
    });
    return NextResponse.json({ message: 'Sync failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
