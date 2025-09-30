import 'server-only';

import { Client } from '@notionhq/client';
import type {
  BlockObjectResponse,
  ListBlockChildrenResponse,
  QueryDatabaseParameters,
  GetPageResponse,
} from '@notionhq/client/build/src/api-endpoints';

import { cacheGet, cacheSet } from './cache';

let _notion: Client | null = null;
export const notion = (() => (_notion ??= new Client({ auth: process.env.NOTION_TOKEN })))();

async function listChildren(blockId: string, pageSize = 100) {
  const out: ListBlockChildrenResponse['results'] = [];
  let cursor: string | undefined;
  while (true) {
    const res = await notion.blocks.children.list({ block_id: blockId, page_size: pageSize, start_cursor: cursor });
    out.push(...res.results);
    if (!res.has_more) break;
    cursor = res.next_cursor ?? undefined;
  }
  return out;
}

export async function getPageMeta(pageId: string) {
  const page = (await notion.pages.retrieve({ page_id: pageId })) as GetPageResponse;

  const icon =
    'icon' in page && page.icon
      ? page.icon.type === 'emoji'
        ? page.icon.emoji ?? null
        : page.icon.type === 'file'
        ? page.icon.file?.url ?? null
        : page.icon.type === 'external'
        ? page.icon.external?.url ?? null
        : null
      : null;

  const cover =
    'cover' in page && page.cover
      ? page.cover.type === 'file'
        ? page.cover.file?.url ?? null
        : page.cover.type === 'external'
        ? page.cover.external?.url ?? null
        : null
      : null;

  const properties: Record<string, unknown> =
    'properties' in page && page.properties ? (page.properties as Record<string, unknown>) : {};

  return { icon, cover, properties, lastEdited: (page as { last_edited_time?: string }).last_edited_time ?? '' };
}

const syncedSourceCache = new Map<string, string | null>();
async function resolveSyncedSourceId(block: BlockObjectResponse): Promise<string | null> {
  if (block.type !== 'synced_block') return null;
  const synced = block.synced_block;
  if (synced && synced.synced_from === null) return block.id;
  if (synced?.synced_from?.block_id) return synced.synced_from.block_id;
  if (syncedSourceCache.has(block.id)) return syncedSourceCache.get(block.id)!;
  try {
    const full = (await notion.blocks.retrieve({ block_id: block.id })) as BlockObjectResponse;
    const src =
      full.type === 'synced_block'
        ? full.synced_block?.synced_from?.block_id ?? full.id ?? null
        : full.id ?? null;
    syncedSourceCache.set(block.id, src);
    return src;
  } catch {
    syncedSourceCache.set(block.id, null);
    return null;
  }
}

export async function pageBlocksDeep(
  pageId: string,
  pageSize = 100,
  opts?: { onMissingBlock?: (id: string) => void }
) {
  const root = await collectChildrenSafe(pageId, pageSize, opts?.onMissingBlock);
  await withChildrenParallel(root, pageSize, opts?.onMissingBlock);
  return root;
}

export async function pageBlocksDeepCached(pageId: string, lastEditedIso?: string, ttlMs = 0) {
  const version =
    lastEditedIso ?? ((await notion.pages.retrieve({ page_id: pageId })) as { last_edited_time: string }).last_edited_time;
  const key = `page:${pageId}:${version}`;
  const cached = cacheGet<BlockObjectResponse[]>(key);
  if (cached) return cached;
  const blocks = await pageBlocksDeep(pageId);
  cacheSet(key, blocks, ttlMs || undefined);
  return blocks;
}

async function collectChildrenSafe(
  blockId: string,
  pageSize: number,
  onMissing?: (id: string) => void
): Promise<BlockObjectResponse[]> {
  try {
    const res = await listChildren(blockId, pageSize);
    return res.filter(
      (child): child is BlockObjectResponse => child.object === 'block' && 'type' in child
    );
  } catch (error) {
    const err = error as { status?: number; code?: string };
    if (err?.status === 404 || err?.code === 'object_not_found') {
      onMissing?.(blockId);
      return [];
    }
    if (err?.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return await collectChildrenSafe(blockId, pageSize, onMissing);
    }
    throw error;
  }
}

async function withChildrenParallel(
  nodes: BlockObjectResponse[],
  pageSize: number,
  onMissing?: (id: string) => void
) {
  const visited = new Set<string>();
  let wave: BlockObjectResponse[] = nodes.filter(
    (n) => n.type === 'synced_block' || n.has_children
  );

  const concurrency = 4;

  while (wave.length) {
    const fetchTargets = await Promise.all(
      wave.map(async (node) => {
        if (node.type === 'synced_block') {
          const src = await resolveSyncedSourceId(node);
          if (!src) {
            (node as BlockObjectResponse & { __synced_unresolved?: boolean }).__synced_unresolved = true;
            return null;
          }
          return { node, id: src };
        }
        return { node, id: node.id };
      })
    );

    const unique = fetchTargets.filter((entry) => !!entry && !visited.has(entry!.id)) as Array<{
      node: BlockObjectResponse;
      id: string;
    }>;

    unique.forEach((entry) => visited.add(entry.id));

    for (let i = 0; i < unique.length; i += concurrency) {
      const slice = unique.slice(i, i + concurrency);
      const childrenChunks = await Promise.all(
        slice.map((entry) => collectChildrenSafe(entry.id, pageSize, onMissing))
      );
      childrenChunks.forEach((children, index) => {
        const node = slice[index].node as BlockObjectResponse & {
          __children?: BlockObjectResponse[];
          __synced_unshared?: boolean;
        };
        if (!children.length && node.type === 'synced_block') {
          node.__synced_unshared = true;
        }
        node.__children = children;
      });
    }

    wave = unique
      .flatMap((entry) => ((entry.node as { __children?: BlockObjectResponse[] }).__children ?? []))
      .filter((child) => child.type === 'synced_block' || child.has_children);
  }
}

export async function queryDb(databaseId: string, body: Omit<QueryDatabaseParameters, 'database_id'> = {}) {
  return await notion.databases.query({ database_id: databaseId, ...body });
}

export async function pageBlocks(pageId: string, pageSize = 100) {
  return await pageBlocksDeep(pageId, pageSize);
}

export async function getPage(pageId: string) {
  return await notion.pages.retrieve({ page_id: pageId });
}

// Types utilitaires
// Étend le type pour inclure un cas non standard "linked_db" (utilisé côté rendu)
export type NotionButtonBlock = {
  object?: 'block';
  id: string;
  type: 'button';
  button?: { label: string; url: string; style?: 'primary' | 'ghost' };
} & Record<string, unknown>;

export type NotionBlock = BlockObjectResponse | NotionButtonBlock;
