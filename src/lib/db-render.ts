import type {
  DatabaseObjectResponse,
  PageObjectResponse,
  PartialPageObjectResponse,
  QueryDatabaseResponse,
  QueryDatabaseParameters,
  GetDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";

import { notion } from "@/lib/notion";
import { cacheGet, cacheSet } from "@/lib/cache";

export type DbItem = {
  id: string;
  title: string;
  slug?: string | null;
  excerpt?: string | null;
  cover?: string | null;
  tags?: string[];
  url?: string | null;
};

export type DbBundle = {
  view: "list" | "gallery";
  name: string;
  items: DbItem[];
  nextCursor?: string | null;
  hasMore: boolean;
};

type DbPropertyMap = {
  titleKey: string;
  slugKey: string | null;
  excerptKey: string | null;
  tagsKey: string | null;
  updatedKey: string | null;
};

type AnyProperty = PageObjectResponse["properties"][string];

function pickProps(db: GetDatabaseResponse): DbPropertyMap {
  const properties = db.properties ?? {};
  const keys = Object.keys(properties);

  const byType = (type: AnyProperty["type"]) =>
    keys.find((key) => properties[key]?.type === type) ?? null;

  const byName = (names: string[]) =>
    keys.find((key) => names.map((n) => n.toLowerCase()).includes(key.toLowerCase())) ?? null;

  const titleKey = byType("title") ?? "Name";
  const slugKey =
    byName(["slug", "url", "permalink"]) ??
    byType("url") ??
    byType("rich_text") ??
    null;
  const excerptKey =
    byName(["excerpt", "summary", "description", "intro"]) ??
    byType("rich_text") ??
    null;
  const tagsKey =
    byName(["tags", "tag", "topics", "category", "categories"]) ??
    byType("multi_select") ??
    byType("select") ??
    null;
  const updatedKey =
    byName(["updated", "updated_at", "last edited", "last_edit"]) ??
    byType("last_edited_time") ??
    null;

  return { titleKey, slugKey, excerptKey, tagsKey, updatedKey };
}

function getTitle(properties: PageObjectResponse["properties"], key: string): string {
  const prop = properties[key];
  if (prop?.type === "title") {
    return prop.title?.[0]?.plain_text ?? "Untitled";
  }
  return "Untitled";
}

function getText(properties: PageObjectResponse["properties"], key: string | null): string | null {
  if (!key) return null;
  const prop = properties[key];
  if (!prop) return null;
  if (prop.type === "rich_text") return prop.rich_text?.[0]?.plain_text ?? null;
  if (prop.type === "url") return prop.url ?? null;
  if (prop.type === "title") return prop.title?.[0]?.plain_text ?? null;
  if (prop.type === "email") return prop.email ?? null;
  if (prop.type === "phone_number") return prop.phone_number ?? null;
  return null;
}

function getTags(properties: PageObjectResponse["properties"], key: string | null): string[] {
  if (!key) return [];
  const prop = properties[key];
  if (!prop) return [];
  if (prop.type === "multi_select") return prop.multi_select?.map((tag) => tag.name) ?? [];
  if (prop.type === "select" && prop.select?.name) return [prop.select.name];
  return [];
}

function getCover(page: PageObjectResponse | PartialPageObjectResponse): string | null {
  const cover = (page as PageObjectResponse).cover;
  if (cover) {
    return cover.type === "external" ? cover.external.url : cover.file.url;
  }

  const propertyCover = (page as PageObjectResponse).properties?.cover as AnyProperty | undefined;
  if (propertyCover && "files" in propertyCover && Array.isArray(propertyCover.files)) {
    const firstFile = propertyCover.files[0];
    if (!firstFile) return null;
    return 'file' in firstFile ? firstFile.file.url : firstFile.external.url;
  }

  return null;
}

function filterPages(results: QueryDatabaseResponse["results"]): PageObjectResponse[] {
  return (results as Array<PageObjectResponse | PartialPageObjectResponse>).filter(
    (page): page is PageObjectResponse => page.object === "page"
  );
}

type NotionAccessError = Error & { code: string };

function noAccessError(id: string): NotionAccessError {
  const error = new Error(`NO_ACCESS_DB:${id}`) as NotionAccessError;
  error.code = "NO_ACCESS_DB";
  return error;
}

export async function fetchDatabaseBundle(
  databaseId: string,
  opts?: { pageSize?: number; startCursor?: string }
): Promise<DbBundle> {
  let database: GetDatabaseResponse;
  try {
    database = await notion.databases.retrieve({ database_id: databaseId });
  } catch (error) {
    const err = error as { status?: number; message?: string };
    const message = String(err?.message ?? "");
    if (err?.status === 404 || /data sources accessible/i.test(message)) {
      throw noAccessError(databaseId);
    }
    throw error;
  }
  const version = (database as { last_edited_time?: string }).last_edited_time as string;
  const cursor = opts?.startCursor ?? "_";
  const cacheKey = `db:${databaseId}:${version}:cursor:${cursor}`;
  const cached = cacheGet<DbBundle>(cacheKey);
  if (cached) return cached;

  const { titleKey, slugKey, excerptKey, tagsKey, updatedKey } = pickProps(database);

  const pageSize = Math.min(opts?.pageSize ?? 12, 50);
  const sorts: QueryDatabaseParameters["sorts"] = updatedKey
    ? [{ property: updatedKey, direction: "descending" }]
    : undefined;

  const response: QueryDatabaseResponse = await notion.databases.query({
    database_id: databaseId,
    page_size: pageSize,
    start_cursor: opts?.startCursor,
    sorts,
  });

  const pages = filterPages(response.results);

  const items: DbItem[] = pages.map((page) => ({
    id: page.id,
    title: getTitle(page.properties, titleKey),
    slug: getText(page.properties, slugKey),
    excerpt: getText(page.properties, excerptKey),
    cover: getCover(page),
    tags: getTags(page.properties, tagsKey),
    url: page.url,
  }));

  const withCover = items.filter((item) => !!item.cover).length;
  const view: "list" | "gallery" =
    items.length > 0 && withCover >= Math.ceil(items.length * 0.6) ? "gallery" : "list";

  const bundle: DbBundle = {
    view,
    name: (database as DatabaseObjectResponse).title?.[0]?.plain_text ?? "Collection",
    items,
    nextCursor: response.next_cursor ?? null,
    hasMore: response.has_more,
  };
  cacheSet(cacheKey, bundle, 5 * 60 * 1000);
  return bundle;
}
