import type { ExtendedRecordMap } from 'notion-types';

import type { DbBundle, DbItem } from '@/lib/db-render';

type CollectionBundle = {
  databaseId: string;
  viewId: string;
  bundle: DbBundle;
};

type CollectionSchema = Record<
  string,
  {
    name: string;
    type: string;
  }
>;

type NotionCollectionValue = {
  id: string;
  name?: unknown;
  schema?: CollectionSchema;
};

type NotionCollectionViewValue = {
  id: string;
  type?: string;
  collection_id?: string;
  name?: string;
};

type NotionCollectionQuery = Record<string, unknown> & {
  blockIds?: string[];
  collection_group_results?: { blockIds?: string[] };
};

type NotionBlockValue = {
  id: string;
  type: string;
  properties?: Record<string, unknown>;
  format?: Record<string, unknown>;
};

const DEFAULT_VIEW = 'list';

export function extractCollectionBundles(recordMap: ExtendedRecordMap): CollectionBundle[] {
  const results: CollectionBundle[] = [];
  const collectionMap = recordMap.collection ?? {};
  const collectionViewMap = recordMap.collection_view ?? {};
  const collectionQueryMap = recordMap.collection_query ?? {};

  for (const [collectionKey, collectionEntry] of Object.entries(collectionMap)) {
    const collection = (collectionEntry as { value?: NotionCollectionValue }).value;
    if (!collection) continue;
    const collectionId = toUuid(collection.id);
    const schema = collection.schema ?? {};

    const relatedViewIds = Object.entries(collectionViewMap)
      .map(([, entry]) => {
        const view = (entry as { value?: NotionCollectionViewValue }).value;
        if (!view) return null;
        if (view.collection_id && toUuid(view.collection_id) !== collectionId) return null;
        return view;
      })
      .filter((view): view is NotionCollectionViewValue => Boolean(view));

    if (!relatedViewIds.length) continue;

    for (const view of relatedViewIds) {
      const viewQueries = collectionQueryMap[collectionKey] as unknown;
      const normalizedViewQueries = viewQueries as Record<string, unknown> | undefined;
      const rawQuery = (normalizedViewQueries?.[view.id ?? ''] ?? {}) as NotionCollectionQuery;
      const blockIds =
        (rawQuery.collection_group_results as { blockIds?: string[] } | undefined)?.blockIds ??
        (rawQuery.blockIds as string[] | undefined) ??
        [];

      const items: DbItem[] = blockIds
        .map((blockId) => {
          const block = (recordMap.block?.[blockId] as { value?: NotionBlockValue })?.value;
          if (!block || block.type !== 'page') return null;
          return buildDbItem(block, schema);
        })
        .filter((item): item is DbItem => Boolean(item));

      const viewType = normalizeViewType(view.type);
      const bundle: DbBundle = {
        view: viewType,
        name: getCollectionName(collection) || view.name || 'Collection',
        items,
        hasMore: false,
        nextCursor: null,
      };

      results.push({ databaseId: collectionId, viewId: view.id ?? '_', bundle });
    }
  }

  return results;
}

function buildDbItem(block: NotionBlockValue, schema: CollectionSchema): DbItem | null {
  const properties = block.properties ?? {};
  const titleKey = findSchemaKey(schema, (entry) => entry.type === 'title');
  const title = titleKey ? getRichText(properties[titleKey]) : '';
  if (!title) return null;

  const slugKey = findSchemaKey(schema, (entry) => /slug/i.test(entry.name));
  const excerptKey = findSchemaKey(schema, (entry) =>
    ['rich_text', 'text'].includes(entry.type) && /excerpt|summary|description/i.test(entry.name)
  );
  const coverKey = findSchemaKey(schema, (entry) => entry.type === 'files');
  const tagsKey = findSchemaKey(schema, (entry) => ['multi_select', 'select'].includes(entry.type));

  const slugRaw = slugKey ? getRichText(properties[slugKey]) : '';
  const excerpt = excerptKey ? getRichText(properties[excerptKey]) : null;
  const cover = coverKey ? getFirstFile(properties[coverKey]) : extractCoverFromFormat(block.format);
  const tags = tagsKey ? getMultiSelect(properties[tagsKey]) : undefined;

  const normalizedSlug = slugRaw ? slugRaw : generateSlug(title, block.id);

  return {
    id: block.id,
    title,
    slug: normalizedSlug,
    excerpt,
    cover,
    tags,
    url: buildNotionUrl(block.id),
  };
}

function getCollectionName(collection: NotionCollectionValue): string {
  const name = getRichText(collection.name);
  return name || 'Collection';
}

function normalizeViewType(type?: string): DbBundle['view'] {
  if (!type) return DEFAULT_VIEW;
  if (type === 'gallery' || type === 'board') return 'gallery';
  return 'list';
}

function getRichText(value: unknown): string {
  if (!value) return '';
  if (Array.isArray(value)) {
    return (
      value
        .map((entry) => {
          if (Array.isArray(entry)) {
            const text = entry[0];
            return typeof text === 'string' ? text : '';
          }
          return '';
        })
        .join('')
        .trim()
    );
  }
  if (typeof value === 'string') return value;
  return '';
}

function getFirstFile(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  for (const entry of value) {
    if (!Array.isArray(entry)) continue;
    if (entry.length < 2) continue;
    const file = entry[1];
    if (Array.isArray(file) && file.length >= 1) {
      const fileEntry = file[0];
      if (typeof fileEntry === 'string') {
        return fileEntry;
      }
    }
  }
  return null;
}

function getMultiSelect(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const entry of value) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const tags = entry[1];
    if (Array.isArray(tags)) {
      for (const tag of tags) {
        if (Array.isArray(tag) && typeof tag[0] === 'string') {
          result.push(tag[0]);
        }
      }
    }
  }
  return result;
}

function extractCoverFromFormat(format?: Record<string, unknown>): string | null {
  if (!format) return null;
  const cover = format.page_cover as string | undefined;
  if (cover && cover.startsWith('http')) return cover;
  return null;
}

function findSchemaKey(
  schema: CollectionSchema,
  predicate: (entry: { name: string; type: string }) => boolean
): string | null {
  for (const [key, value] of Object.entries(schema)) {
    if (predicate(value)) return key;
  }
  return null;
}

function toUuid(id: string | undefined): string {
  if (!id) return '';
  if (id.includes('-')) return id;
  return id.replace(/^(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})$/, '$1-$2-$3-$4-$5');
}

function buildNotionUrl(id: string): string {
  const clean = id.replace(/-/g, '');
  return `https://www.notion.so/${clean}`;
}

function generateSlug(title: string, id: string): string {
  const base = slugify(title);
  if (base) return base;
  return slugify(id.slice(0, 12));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
