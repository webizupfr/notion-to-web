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

export type DbItemCell = {
  key: string;
  label: string;
  type: string;
  text: string | null;
  value: unknown;
};

export type DbItem = {
  id: string;
  title: string;
  slug?: string | null;
  excerpt?: string | null;
  cover?: string | null;
  tags?: string[];
  url?: string | null;
  cells?: DbItemCell[];
};

export type DbBundle = {
  view: "list" | "gallery" | "table";
  viewId?: string | null;
  viewName?: string | null;
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

function buildCellsFromPage(
  database: GetDatabaseResponse,
  page: PageObjectResponse
): DbItemCell[] {
  const result: DbItemCell[] = [];
  const dbProps = database.properties ?? {};
  const pageProps = page.properties ?? {};

  for (const [key, prop] of Object.entries(pageProps)) {
    const meta = dbProps[key];
    const label = meta?.name ?? key;
    const type = (meta?.type as string | undefined) ?? prop?.type ?? "text";

    const cell: DbItemCell = {
      key,
      label,
      type,
      text: null,
      value: null,
    };

    switch (prop?.type) {
      case "title": {
        const text = prop.title?.map((t) => t.plain_text).join("").trim() || null;
        cell.text = text;
        cell.value = text;
        break;
      }
      case "rich_text": {
        const text = prop.rich_text?.map((t) => t.plain_text).join("").trim() || null;
        cell.text = text;
        cell.value = text;
        break;
      }
      case "url":
        cell.text = prop.url ?? null;
        cell.value = prop.url ?? null;
        break;
      case "email":
        cell.text = prop.email ?? null;
        cell.value = prop.email ?? null;
        break;
      case "phone_number":
        cell.text = prop.phone_number ?? null;
        cell.value = prop.phone_number ?? null;
        break;
      case "number":
        cell.text =
          typeof prop.number === "number" && Number.isFinite(prop.number)
            ? String(prop.number)
            : prop.number === null
              ? null
              : String(prop.number ?? "");
        cell.value = prop.number ?? null;
        break;
      case "select":
        cell.text = prop.select?.name ?? null;
        cell.value = prop.select?.name ?? null;
        break;
      case "status":
        cell.text = prop.status?.name ?? null;
        cell.value = prop.status?.name ?? null;
        break;
      case "multi_select": {
        const tags = prop.multi_select?.map((tag) => tag.name) ?? [];
        cell.text = tags.length ? tags.join(", ") : null;
        cell.value = tags;
        break;
      }
      case "people": {
        const people =
          prop.people?.map((person) => {
            if ("name" in person && person.name) return person.name;
            return person.id;
          }) ?? [];
        cell.text = people.length ? people.join(", ") : null;
        cell.value = people;
        break;
      }
      case "date":
        cell.text = prop.date?.start ?? null;
        cell.value = prop.date ?? null;
        break;
      case "checkbox":
        cell.text = prop.checkbox ? "Yes" : "No";
        cell.value = prop.checkbox;
        break;
      case "files":
        cell.text = prop.files?.[0]?.name ?? null;
        cell.value = prop.files?.map((file) => {
          if ("external" in file) return file.external.url;
          if ("file" in file) return file.file.url;
          return null;
        });
        break;
      default:
        cell.text = null;
        cell.value = null;
    }

    result.push(cell);
  }

  return result;
}

type NotionAccessError = Error & { code: string };

function noAccessError(id: string): NotionAccessError {
  const error = new Error(`NO_ACCESS_DB:${id}`) as NotionAccessError;
  error.code = "NO_ACCESS_DB";
  return error;
}

type FetchBundleOptions = {
  pageSize?: number;
  startCursor?: string;
  viewId?: string | null;
  viewType?: DbBundle["view"] | null;
  viewName?: string | null;
};

export async function fetchDatabaseBundle(
  databaseId: string,
  opts?: FetchBundleOptions
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
  const viewKey = opts?.viewId ?? "_";
  const cacheKey = `db:${databaseId}:${version}:view:${viewKey}:cursor:${cursor}`;
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
    cells: buildCellsFromPage(database, page),
  }));

  const withCover = items.filter((item) => !!item.cover).length;
  const inferredView: DbBundle["view"] =
    items.length > 0 && withCover >= Math.ceil(items.length * 0.6) ? "gallery" : "list";
  const view = opts?.viewType ?? inferredView;

  const bundle: DbBundle = {
    view,
    viewId: opts?.viewId ?? null,
    viewName: opts?.viewName ?? null,
    name: (database as DatabaseObjectResponse).title?.[0]?.plain_text ?? "Collection",
    items,
    nextCursor: response.next_cursor ?? null,
    hasMore: response.has_more,
  };
  cacheSet(cacheKey, bundle, 5 * 60 * 1000);
  return bundle;
}
