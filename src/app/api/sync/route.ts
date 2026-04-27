import 'server-only';

import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

import type {
  PageObjectResponse,
  QueryDatabaseResponse,
  QueryDatabaseParameters,
  BlockObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';

import { auth } from '@/auth';
import { getPageMeta, pageBlocksDeep, queryDb } from '@/lib/notion';
import type { NotionBlock } from '@/lib/notion';
import { mirrorRemoteImage } from '@/lib/media';
import { fetchRecordMap } from '@/lib/notion-record';
import { extractHints } from '@/lib/record-hints';
import {
  getPageBundle,
  setPageBundle,
  setPostsIndex,
  type PageBundle,
} from '@/lib/content-store';
import type { PageMeta, PostMeta } from '@/lib/types';

/**
 * Sync Notion → KV pour les pages statiques (DB Pages) et le blog (DB Posts).
 *
 * Pipeline :
 *   1. Query la DB → liste de pages
 *   2. Pour chaque page :
 *      - extract slug, title, visibility, password, description (cf. .env DB schema)
 *      - fetch deep blocks via API officielle
 *      - mirror images vers Cloudinary (URLs Notion S3 expirent en ~3h)
 *      - récupère le RecordMap pour layouts avancés (column ratios, button hints)
 *      - mirror cover/icon
 *      - store bundle dans KV (clé `page:slug`)
 *
 * Endpoints :
 *   - GET /api/sync?secret=... → run full sync (cron quotidien Vercel + manuel)
 *   - POST /api/sync → identique
 *
 * Sync programs (DB Programs v3) → fichier séparé : /api/sync/programs/route.ts
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

const PAGES_DB = process.env.NOTION_PAGES_DB;
const POSTS_DB = process.env.NOTION_POSTS_DB;
const CRON_SECRET = process.env.CRON_SECRET;
const SYNC_FAILURE_WEBHOOK = process.env.SYNC_FAILURE_WEBHOOK;

// ─── Types internes ──────────────────────────────────────────────────────────

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
  recordMapPages: number;
  buttonsConverted: number;
  pagesSkipped: number;
};

type SyncOptions = {
  type: 'page' | 'post';
  stats: SyncStats;
  force?: boolean;
};

type AugmentedBlock = NotionBlock & { __children?: NotionBlock[] };

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  if ((property as { type?: string }).type === 'status') {
    const p = property as Extract<PageObjectResponse['properties'][string], { type: 'status' }>;
    return p.status?.name ?? null;
  }
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
    pages.push(...response.results.filter(isFullPage));
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return pages;
}

function getBlockChildren(block: NotionBlock): NotionBlock[] {
  return ((block as { __children?: NotionBlock[] }).__children ?? []) as NotionBlock[];
}

/**
 * Mirror vers Cloudinary les images du bundle (les URLs Notion S3 expirent ~3h).
 * Récursif sur les __children.
 */
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
      const fileMeta = image.type === 'file'
        ? (image.file as { mime_type?: string; type?: string; url: string; expiry_time?: string })
        : null;
      const contentTypeHint = fileMeta?.mime_type ?? fileMeta?.type ?? null;

      if (sourceUrl) {
        const key = `notion-pages/${context.pageId}/blocks/${block.id}`;
        const mirrored = await mirrorRemoteImage({ sourceUrl, targetKey: key, contentTypeHint });
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
          (imageBlock.image as Extract<typeof imageBlock.image, { type: 'external' }>).external.url = mirrored.url;
        } else {
          (imageBlock.image as Extract<typeof imageBlock.image, { type: 'file' }>).file.url = mirrored.url;
        }
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

// ─── Sync d'une page (DB Pages ou DB Posts) ─────────────────────────────────

async function syncPage(page: PageObjectResponse, opts: SyncOptions) {
  const slug = firstRichText(page.properties.slug);
  if (!slug) return null;

  const title = extractTitle(page.properties.Title);
  const visibility = (selectValue(page.properties.visibility) as PageMeta['visibility']) ?? 'public';
  const password = firstRichText(page.properties.password);
  const properties = page.properties as Record<string, PageObjectResponse['properties'][string] | undefined>;
  const description = firstRichText(properties.description);

  const metaInfo = await getPageMeta(page.id);
  const existing = await getPageBundle(slug);

  // Skip si la page n'a pas été modifiée (sync sélectif)
  if (!opts.force && existing && existing.meta.lastEdited === metaInfo.lastEdited) {
    opts.stats.pagesSkipped += 1;
    return existing.meta;
  }

  const blocks = await pageBlocksDeep(page.id, 100);
  const processedBlocks = await processBlocksMedia(blocks, {
    slug,
    pageId: page.id,
    stats: opts.stats,
  });

  // RecordMap : layouts avancés (column ratios, button hints, image align)
  const recordMap = await fetchRecordMap(page.id);
  if (recordMap) {
    opts.stats.recordMapPages += 1;
    const hints = extractHints(recordMap);

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

    // Column ratios depuis le recordMap (l'API officielle ne les expose pas)
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
          (listBlock as unknown as { __column_ratios?: number[] }).__column_ratios = ratios.map((r) => r / total);
        }
      }
    }

    // Image align/maxWidth hints depuis le recordMap
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

    // Buttons natifs Notion : convertir les blocks "unsupported" en "button" via les hints
    if (Object.keys(hints.buttons).length) {
      const registerButton = () => { opts.stats.buttonsConverted += 1; };

      const applyButtonHints = (block: NotionBlock) => {
        if (block.type === 'unsupported') {
          const hint = getHint(hints.buttons, block.id);
          if (hint) {
            const augmented = block as unknown as Record<string, unknown>;
            augmented.type = 'button';
            augmented.button = hint;
            registerButton();
            return;
          }
        }
        const children = (block as { __children?: NotionBlock[] }).__children;
        children?.forEach(applyButtonHints);
      };
      processedBlocks.forEach(applyButtonHints);

      // Buttons orphelins (pas trouvés via les blocks API)
      for (const [blockId, hint] of Object.entries(hints.buttons)) {
        if (findBlockById(processedBlocks, blockId)) continue;

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
          ((parent as AugmentedBlock).__children ||= []).push(synthetic);
        } else {
          processedBlocks.push(synthetic);
        }
        registerButton();
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

  const meta: PageBundle['meta'] = {
    slug,
    notionId: page.id,
    title,
    visibility,
    password,
    lastEdited: metaInfo.lastEdited,
    icon,
    cover,
    fullWidth: false,
  };
  if (description !== null) meta.description = description;

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

  return meta;
}

// ─── Run modes ──────────────────────────────────────────────────────────────

export async function runFullSync(force: boolean = false) {
  if (!PAGES_DB) {
    throw new Error('Missing NOTION_PAGES_DB env var');
  }

  const syncedPages: string[] = [];
  const postsIndex: PostMeta[] = [];
  const stats: SyncStats = {
    imageMirrored: 0,
    imageFallbacks: [],
    recordMapPages: 0,
    buttonsConverted: 0,
    pagesSkipped: 0,
  };
  const startedAt = Date.now();

  // POSTS_DB optionnel : si absent → on skip juste le blog
  const [pages, posts] = await Promise.all([
    collectDatabasePages(PAGES_DB),
    POSTS_DB ? collectDatabasePages(POSTS_DB) : Promise.resolve([]),
  ]);

  for (const page of pages) {
    const meta = await syncPage(page, { type: 'page', stats, force });
    if (meta) syncedPages.push(meta.slug);
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

  if (POSTS_DB) {
    await setPostsIndex({ items: postsIndex, syncedAt: new Date().toISOString() });
    await revalidateTag('posts:index');
    await revalidatePath('/blog', 'page');
  }

  const summary = {
    durationMs: Date.now() - startedAt,
    pagesProcessed: pages.length,
    pagesSynced: syncedPages.length,
    pagesSkipped: stats.pagesSkipped,
    postsProcessed: posts.length,
    postsSynced: postsIndex.length,
    imageMirrored: stats.imageMirrored,
    imageFallbacks: stats.imageFallbacks.length,
    recordMapPages: stats.recordMapPages,
    buttonsConverted: stats.buttonsConverted,
  };

  console.info('[sync] summary', summary);

  return {
    ok: true,
    synced: syncedPages.length,
    posts: postsIndex.length,
    metrics: summary,
    imageFallbackSamples: stats.imageFallbacks.slice(0, 10),
  };
}

/**
 * Sync ciblé pour un slug unique (page ou post).
 * Tente d'abord PAGES_DB, puis POSTS_DB.
 */
export async function runSyncOne(slug: string, force: boolean = false) {
  if (!PAGES_DB) {
    throw new Error('Missing NOTION_PAGES_DB env var');
  }

  const stats: SyncStats = {
    imageMirrored: 0,
    imageFallbacks: [],
    recordMapPages: 0,
    buttonsConverted: 0,
    pagesSkipped: 0,
  };
  const startedAt = Date.now();
  const normalized = slug.replace(/^\//, '');

  const findBySlug = async (dbId: string) => {
    const res = await queryDb(dbId, {
      page_size: 2,
      filter: { property: 'slug', rich_text: { equals: normalized } },
    });
    return res.results.find(isFullPage) as PageObjectResponse | undefined;
  };

  let processedType: 'page' | 'post' | 'none' = 'none';
  const page = await findBySlug(PAGES_DB);
  if (page) {
    await syncPage(page, { type: 'page', stats, force });
    processedType = 'page';
  } else if (POSTS_DB) {
    const post = await findBySlug(POSTS_DB);
    if (post) {
      await syncPage(post, { type: 'post', stats, force });
      processedType = 'post';
    }
  }

  return {
    ok: true,
    slug: normalized,
    processedType,
    metrics: {
      durationMs: Date.now() - startedAt,
      processedType,
      imageMirrored: stats.imageMirrored,
      imageFallbacks: stats.imageFallbacks.length,
      recordMapPages: stats.recordMapPages,
      buttonsConverted: stats.buttonsConverted,
    },
  };
}

// ─── HTTP handlers (cron + manuel) ───────────────────────────────────────────

export async function GET(request: Request) {
  if (!CRON_SECRET) {
    return NextResponse.json({ message: 'Missing CRON_SECRET' }, { status: 500 });
  }
  if (!PAGES_DB) {
    return NextResponse.json({ message: 'Missing NOTION_PAGES_DB env var' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const force = searchParams.get('force') === '1' || searchParams.get('force') === 'true';

  // Vercel cron envoie un Bearer header, manuel utilise ?secret=
  const authHeader = request.headers.get('authorization') ?? '';
  const isAuthorized = secret === CRON_SECRET || authHeader === `Bearer ${CRON_SECRET}`;
  if (!isAuthorized) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runFullSync(force);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[sync] fatal error:', error);
    await notifySyncFailure({
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    const debug = process.env.NODE_ENV !== 'production';
    return NextResponse.json(
      debug
        ? {
            message: 'Sync failed',
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack?.split('\n').slice(0, 8) : null,
          }
        : { message: 'Sync failed' },
      { status: 500 },
    );
  }
}

/**
 * POST → trigger manuel depuis le panneau admin (auth via session NextAuth).
 * Utilisé par le bouton "Synchroniser Notion" dans /admin/programs.
 */
export async function POST(request: Request) {
  // Session admin (cookie NextAuth) → accès direct sans CRON_SECRET
  const session = await auth();
  if (session?.user?.role === 'admin') {
    if (!PAGES_DB) {
      return NextResponse.json({ message: 'Missing NOTION_PAGES_DB env var' }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === '1' || searchParams.get('force') === 'true';
    try {
      const result = await runFullSync(force);
      return NextResponse.json(result);
    } catch (error) {
      console.error('[sync] fatal error (admin manual):', error);
      return NextResponse.json(
        { message: 'Sync failed', error: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      );
    }
  }

  // Sinon fallback CRON_SECRET (Bearer ou ?secret=)
  return GET(request);
}
