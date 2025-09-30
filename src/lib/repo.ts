import type {
  PageObjectResponse,
  PartialPageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

import { getPage, queryDb } from "./notion";
import { getPageBundle, getPostsIndex } from "@/lib/content-store";
import type { PageMeta, PostMeta } from "./types";

const PAGES_DB = process.env.NOTION_PAGES_DB!;
const POSTS_DB = process.env.NOTION_POSTS_DB!;

function isFullPage(
  page: PageObjectResponse | PartialPageObjectResponse | unknown
): page is PageObjectResponse {
  return (
    typeof page === "object" &&
    page !== null &&
    (page as { object?: string }).object === "page"
  );
}

type PageProperty = PageObjectResponse["properties"][string];
type TitlePropertyValue  = Extract<PageProperty, { type: "title" }>;
type RichTextPropertyValue = Extract<PageProperty, { type: "rich_text" }>;
type SelectPropertyValue = Extract<PageProperty, { type: "select" }>;
type FilesPropertyValue  = Extract<PageProperty, { type: "files" }>;

function isTitleProperty(property: PageProperty | undefined): property is TitlePropertyValue {
  return !!property && property.type === "title";
}
function isRichTextProperty(property: PageProperty | undefined): property is RichTextPropertyValue {
  return !!property && property.type === "rich_text";
}
function isSelectProperty(property: PageProperty | undefined): property is SelectPropertyValue {
  return !!property && property.type === "select";
}
function isFilesProperty(property: PageProperty | undefined): property is FilesPropertyValue {
  return !!property && property.type === "files";
}

function extractTitle(property: PageProperty | undefined): string {
  if (!isTitleProperty(property)) return "Untitled";
  return property.title?.[0]?.plain_text ?? "Untitled";
}
function extractRichText(property: PageProperty | undefined): string | null {
  if (!isRichTextProperty(property)) return null;
  return property.rich_text?.[0]?.plain_text ?? null;
}
function extractSelect(property: PageProperty | undefined): string | null {
  if (!isSelectProperty(property)) return null;
  return property.select?.name ?? null;
}

/** URL de la 1ère pièce jointe d’une propriété Notion “Files & media” */
function extractFileUrl(property: PageProperty | undefined): string | null {
  if (!isFilesProperty(property)) return null;
  const f = property.files?.[0];
  if (!f) return null;
  if (f.type === "file") return f.file?.url ?? null;
  if (f.type === "external") return f.external?.url ?? null;
  return null;
}

export async function getPageBySlug(slug: string): Promise<PageMeta | null> {
  const cached = await getPageBundle(slug);
  if (cached) {
    return cached.meta;
  }

  const response = await queryDb(PAGES_DB, {
    filter: { property: "slug", rich_text: { equals: slug } },
    page_size: 1,
  });

  const page = response.results.find(isFullPage);
  if (!page) return null;

  let fullWidth = false;
  try {
    const details = await getPage(page.id);
    const raw = details as unknown as {
      full_width?: boolean;
      page_full_width?: boolean;
      is_full_width?: boolean;
    };
    fullWidth = Boolean(raw.full_width ?? raw.page_full_width ?? raw.is_full_width ?? false);
  } catch {
    fullWidth = false;
  }

  return {
    slug,
    visibility: (extractSelect(page.properties.visibility) as PageMeta["visibility"]) ?? "public",
    password: extractRichText(page.properties.password),
    notionId: page.id,
    title: extractTitle(page.properties.Title),
    fullWidth,
  };
}

export async function getPostBySlug(slug: string): Promise<PostMeta | null> {
  const cached = await getPageBundle(slug);
  if (cached) {
    const postsIndex = await getPostsIndex();
    const fromIndex = postsIndex?.items.find((item) => item.slug === slug);
    const excerpt = fromIndex?.excerpt ?? null;
    const cover   = fromIndex?.cover ?? cached.meta.cover ?? null;

    return {
      slug,
      title: cached.meta.title,
      excerpt,
      notionId: cached.meta.notionId,
      cover,
    };
  }

  const response = await queryDb(POSTS_DB, {
    filter: { property: "slug", rich_text: { equals: slug } },
    page_size: 1,
  });

  const page = response.results.find(isFullPage);
  if (!page) return null;

  return {
    slug,
    title: extractTitle(page.properties.Title),
    excerpt: extractRichText(page.properties.excerpt),
    notionId: page.id,
    cover: extractFileUrl(page.properties.cover), // propriété Notion “cover” (Files & media)
  };
}

export async function listPosts(limit = 20): Promise<PostMeta[]> {
  const index = await getPostsIndex();
  if (index) {
    return index.items.slice(0, limit).map((item) => ({
      slug: item.slug,
      title: item.title,
      excerpt: item.excerpt ?? null,
      notionId: item.notionId,
      cover: item.cover ?? null,
    }));
  }

  const response = await queryDb(POSTS_DB, {
    page_size: limit,
    sorts: [{ property: "updated_at", direction: "descending" }],
  });

  return response.results.filter(isFullPage).map((page) => ({
    slug: extractRichText(page.properties.slug) ?? page.id,
    title: extractTitle(page.properties.Title),
    excerpt: extractRichText(page.properties.excerpt),
    notionId: page.id,
    cover: extractFileUrl(page.properties.cover),
  }));
}
