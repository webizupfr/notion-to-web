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
  recordMapPages: number;
  buttonsConverted: number;
  buttonSources: Array<{ slug: string; pageId: string; blockId: string }>;
  unsupportedBlocks: Array<{ slug: string; pageId: string; blockId: string }>;
  databaseChildrenSynced: number;
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

  const handledDatabases = new Set<string>();

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
    await syncDatabaseChildren(databaseId, slug, opts);
  }

  return meta;
}

/**
 * Synchronise les pages enfants d'une database pour qu'elles soient accessibles individuellement
 * Par exemple: si la page "sprint" contient une database avec l'item "cas-client-adecco",
 * cette fonction va créer une page accessible à "/sprint/cas-client-adecco"
 */
async function syncDatabaseChildren(
  databaseId: string,
  parentSlug: string,
  opts: { type: 'page' | 'post'; stats: SyncStats; force?: boolean }
) {
  try {
    // Récupérer toutes les pages de la database
    const dbPages = await collectDatabasePages(databaseId);
    
    console.log(`[sync] Found ${dbPages.length} children in database ${databaseId} for parent "${parentSlug}"`);

    for (const dbPage of dbPages) {
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

        await syncPage(modifiedPage, { ...opts, type: 'page' });
        opts.stats.databaseChildrenSynced += 1;
        
        // Revalider le chemin de la page enfant
        await revalidatePath(`/${fullSlug}`, 'page');
      } catch (error) {
        console.error(`[sync] Failed to sync database child ${fullSlug}:`, error);
      }
    }
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
    recordMapPages: 0,
    buttonsConverted: 0,
    buttonSources: [],
    unsupportedBlocks: [],
    databaseChildrenSynced: 0,
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
      databaseChildrenSynced: stats.databaseChildrenSynced,
      imageMirrored: stats.imageMirrored,
      imageFallbacks: stats.imageFallbacks.length,
      missingBlocks: Array.from(stats.missingBlocks),
      recordMapPages: stats.recordMapPages,
      buttonsConverted: stats.buttonsConverted,
      unsupportedBlocks: stats.unsupportedBlocks,
    };

    console.info('[sync] summary', summary);

    const fallbackSamples = stats.imageFallbacks.slice(0, 10);

    return NextResponse.json({
      ok: true,
      synced: syncedPages.length,
      posts: postsIndex.length,
      metrics: summary,
      imageFallbackSamples: fallbackSamples,
      buttonSamples: stats.buttonSources.slice(0, 10),
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.error('Sync error', error);
    await notifySyncFailure({
      error: error instanceof Error ? error.message : String(error),
      durationMs,
      imageFallbacks: stats.imageFallbacks.slice(0, 10),
      missingBlocks: Array.from(stats.missingBlocks),
      buttonsConverted: stats.buttonsConverted,
      unsupportedBlocks: stats.unsupportedBlocks,
    });
    return NextResponse.json({ message: 'Sync failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
