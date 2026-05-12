import { Fragment } from "react";
import type { ReactNode } from "react";
import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";
import Link from "next/link";

import { renderWidget } from "@/components/widgets/renderWidget";
import { parseWidget } from "@/lib/widget-parser";
import { resolveDatabaseIdFromBlock, type LinkedDatabaseBlock } from "@/lib/resolve-db-id";
import type { NotionBlock } from "@/lib/notion";
import type { NavItem } from "@/lib/types";
import { groupLists, slugify, type GroupedListBlock } from "./utils";
import {
  NotionParagraph,
  NotionHeading,
  NotionQuote,
  NotionDivider,
  NotionList,
  NotionTodo,
  NotionCallout,
  NotionToggle,
  NotionToggleHeading,
  NotionImage,
  NotionVideo,
  NotionAudio,
  NotionEmbed,
  NotionBookmark,
  NotionFile,
  NotionColumns,
  NotionTable,
  NotionCode,
  NotionHtml,
  NotionEquation,
  NotionTableOfContents,
  NotionBreadcrumb,
  NotionDatabase,
  NotionUnknown,
  NotionButton,
  NotionTallyEmbed,
  NotionAirtableEmbed,
  NotionPdfEmbed,
  RichText,
} from "@/components/notion/ui";

// Router Notion : chaque type → composant UI (pas de style ici)
// paragraph → NotionParagraph
// heading_1/2/3 → NotionHeading
// quote → NotionQuote
// divider → NotionDivider
// bulleted_list_item / numbered_list_item → NotionList (grouped)
// to_do → NotionTodo
// callout → NotionCallout
// toggle + toggle_heading_* → NotionToggle / NotionToggleHeading
// image/video/audio/embed/bookmark/file → NotionImage/Video/Audio/Embed/Bookmark/File
// code → NotionCode
// equation → NotionEquation
// table → NotionTable
// column_list/column/synced_block → NotionColumns (+ recursion)
// table_of_contents → NotionTableOfContents
// breadcrumb → NotionBreadcrumb
// collection/database → NotionDatabase

type ButtonBlock = Extract<NotionBlock, { type: "button" }>;
type TocEntry = { id: string; title: string; level: 1 | 2 | 3 };
type NavLink = { id?: string; slug: string; title: string; icon?: string | null };
type NavigationIndex = Map<string, NavLink>;

const NOTION_PAGE_ID_RE = /([0-9a-f]{32})/i;
const NOTION_PAGE_UUID_RE = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

const MEDIA_BLOCKS = new Set<NotionBlock["type"]>([
  "image",
  "video",
  "file",
  "pdf",
  "bookmark",
  "embed",
  "audio",
]);

const warnedUnknown = new Set<string>();

function canonicalizeId(value?: string | null): string {
  return (value ?? "").replace(/-/g, "").toLowerCase();
}

function buildNavigationIndex(navigation?: NavItem[]): NavigationIndex | null {
  if (!navigation?.length) return null;
  const index: NavigationIndex = new Map();
  const add = (id: string | undefined, link: NavLink) => {
    if (!id || !link.slug) return;
    index.set(canonicalizeId(id), link);
  };

  for (const item of navigation) {
    if (item.type === "page" && item.slug) {
      add(item.id, { id: item.id, slug: item.slug, title: item.title, icon: item.icon ?? null });
      continue;
    }
    if (item.type === "section" && item.children?.length) {
      for (const child of item.children) {
        if (!child.slug) continue;
        add(child.id, { id: child.id, slug: child.slug, title: child.title, icon: child.icon ?? null });
      }
    }
  }

  return index;
}

function resolveNavigationLink(index: NavigationIndex | null | undefined, id?: string | null): NavLink | null {
  if (!index || !id) return null;
  return index.get(canonicalizeId(id)) ?? null;
}

function normalizeInternalHref(slug: string) {
  const trimmed = slug.replace(/^\/+/, "");
  return trimmed ? `/${trimmed}` : "/";
}

function extractNotionPageIdFromHref(href: string): string | null {
  const uuidMatch = href.match(NOTION_PAGE_UUID_RE);
  if (uuidMatch?.[1]) return uuidMatch[1];
  const idMatch = href.match(NOTION_PAGE_ID_RE);
  if (idMatch?.[1]) return idMatch[1];
  return null;
}

function isNotionUrl(href: string): boolean {
  if (href.startsWith("notion://")) return true;
  try {
    const url = new URL(href);
    const host = url.hostname.toLowerCase();
    return host.endsWith("notion.so") || host.endsWith("notion.site");
  } catch {
    return false;
  }
}

function isNotionPath(href: string): boolean {
  if (!href.startsWith("/")) return false;
  return Boolean(extractNotionPageIdFromHref(href));
}

function resolveInternalHrefFromNotionLink(
  href: string,
  navigationIndex?: NavigationIndex | null
): string | null {
  if (!navigationIndex) return null;
  if (!(isNotionUrl(href) || isNotionPath(href))) return null;
  const pageId = extractNotionPageIdFromHref(href);
  if (!pageId) return null;
  const navLink = resolveNavigationLink(navigationIndex, pageId);
  if (!navLink?.slug) return null;
  return normalizeInternalHref(navLink.slug);
}

function renderInternalPageLink({ slug, title, icon }: { slug: string; title: string; icon?: string | null }) {
  const href = normalizeInternalHref(slug);
  const emojiIcon = icon && !/^https?:\/\//i.test(icon) ? icon : null;
  return (
    <Link href={href} className="link-card">
      <div className="flex items-center gap-[var(--space-sm)]">
        {emojiIcon ? <span aria-hidden className="text-lg">{emojiIcon}</span> : null}
        <span className="link-card__title" style={{ margin: 0, fontSize: "1rem" }}>{title}</span>
      </div>
      <span className="link-card__arrow" aria-hidden>→</span>
    </Link>
  );
}

function getBlockChildren(block: NotionBlock): NotionBlock[] {
  return (block as { __children?: NotionBlock[] }).__children ?? [];
}

function plainText(items: RichTextItemResponse[] | undefined): string {
  return (items ?? []).map((r) => r.plain_text ?? "").join(" ").trim();
}

function parseYouTube(url: string): { embed: string } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const params = new URLSearchParams({ rel: "0", modestbranding: "1", playsinline: "1" });

    const timeToSeconds = (t: string): number => {
      if (!t) return 0;
      const m = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i.exec(t);
      if (!m) return 0;
      return (Number(m[1] || 0) * 3600) + (Number(m[2] || 0) * 60) + Number(m[3] || 0);
    };

    const tParam = u.searchParams.get("t") || (u.hash ? new URLSearchParams(u.hash.slice(1)).get("t") : null);
    if (tParam) {
      const start = timeToSeconds(tParam);
      if (start > 0) params.set("start", String(start));
    }

    const base = "https://www.youtube-nocookie.com/embed/";
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "");
      if (id) return { embed: `${base}${id}?${params.toString()}` };
    }
    if (host.endsWith("youtube.com")) {
      if (u.pathname.startsWith("/watch")) {
        const id = u.searchParams.get("v");
        if (id) return { embed: `${base}${id}?${params.toString()}` };
      }
      if (u.pathname.startsWith("/shorts/")) {
        const id = u.pathname.split("/")[2];
        if (id) return { embed: `${base}${id}?${params.toString()}` };
      }
      if (u.pathname.startsWith("/embed/")) {
        const id = u.pathname.split("/")[2] || "";
        return { embed: `${base}${id}?${params.toString()}` };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

function renderUnknown(type: string) {
  if (process.env.NODE_ENV !== "production" && !warnedUnknown.has(type)) {
    console.warn("[notion-block:unknown]", type);
    warnedUnknown.add(type);
  }
  return <NotionUnknown type={type} />;
}

function isButtonBlock(block: NotionBlock): block is ButtonBlock {
  return (block as { type?: string }).type === "button";
}

function parseButtonFromRichText(
  items: RichTextItemResponse[] | undefined
): { href: string; label: string; variant: "primary" | "ghost" } | null {
  if (!items?.length) return null;
  const labelRaw = items.map((i) => i.plain_text ?? "").join("");
  const tokenMatch = /\{btn(?::(primary|ghost))?\}/i.exec(labelRaw);
  const hasBtnToken = !!tokenMatch;
  const linkItems = items.filter((i) => !!i.href);
  if (!hasBtnToken && linkItems.length !== 1) return null;
  const href = (linkItems[0] ?? items[0])?.href;
  if (!href) return null;

  let variant: "primary" | "ghost" = (tokenMatch?.[1] as "primary" | "ghost") || "primary";
  if (!tokenMatch) {
    const hasGrayTone = linkItems.some((i) => (i.annotations?.color ?? "default").startsWith("gray"));
    if (hasGrayTone) variant = "ghost";
  }

  const baseLabel = tokenMatch ? labelRaw : linkItems[0]?.plain_text ?? labelRaw;
  const label = baseLabel.replace(/\{btn(?::(primary|ghost))?\}/gi, "").trim();
  if (!label) return null;

  return { href, label, variant };
}

function collectHeadings(blocks: NotionBlock[], entries: TocEntry[] = []): TocEntry[] {
  for (const block of blocks) {
    const type = (block as { type?: string }).type;
    if (type === "heading_1") {
      const title = plainText((block as Extract<NotionBlock, { type: "heading_1" }>).heading_1.rich_text);
      if (title) entries.push({ id: `b-${block.id}`, title, level: 1 });
    } else if (type === "heading_2") {
      const title = plainText((block as Extract<NotionBlock, { type: "heading_2" }>).heading_2.rich_text);
      if (title) entries.push({ id: `b-${block.id}`, title, level: 2 });
    } else if (type === "heading_3") {
      const title = plainText((block as Extract<NotionBlock, { type: "heading_3" }>).heading_3.rich_text);
      if (title) entries.push({ id: `b-${block.id}`, title, level: 3 });
    }

    if (type === "toggle_heading_1") {
      const rich = (block as { toggle_heading_1?: { rich_text?: RichTextItemResponse[] } }).toggle_heading_1
        ?.rich_text;
      const title = plainText(rich);
      if (title) entries.push({ id: `b-${block.id}`, title, level: 1 });
    } else if (type === "toggle_heading_2") {
      const rich = (block as { toggle_heading_2?: { rich_text?: RichTextItemResponse[] } }).toggle_heading_2
        ?.rich_text;
      const title = plainText(rich);
      if (title) entries.push({ id: `b-${block.id}`, title, level: 2 });
    } else if (type === "toggle_heading_3") {
      const rich = (block as { toggle_heading_3?: { rich_text?: RichTextItemResponse[] } }).toggle_heading_3
        ?.rich_text;
      const title = plainText(rich);
      if (title) entries.push({ id: `b-${block.id}`, title, level: 3 });
    }
    const children = getBlockChildren(block);
    if (children.length) collectHeadings(children, entries);
  }
  return entries;
}

async function renderCollectionBlock(block: NotionBlock, currentSlug?: string) {
  const record = block as Record<string, unknown>;
  const ids: string[] = [];
  const addId = (value: unknown) => {
    if (typeof value === "string" && value.trim()) ids.push(value.trim());
  };
  const viewIds: string[] = [];
  const addView = (value: unknown) => {
    if (typeof value === "string" && value.trim()) viewIds.push(value.trim());
  };

  addId((record as { collection_id?: string }).collection_id);
  addView((record as { view_id?: string }).view_id);

  const databaseId = ids[0] ?? (await resolveDatabaseIdFromBlock(block as LinkedDatabaseBlock));
  const viewId = viewIds[0] ?? null;
  if (!databaseId) return null;

  return (
    <NotionDatabase databaseId={databaseId} viewId={viewId ?? undefined} basePath={currentSlug ? `/${currentSlug}` : ""} />
  );
}

function renderGroupedList(
  block: GroupedListBlock,
  currentSlug?: string,
  toc?: TocEntry[],
  renderMode?: "default" | "day",
  navigationIndex?: NavigationIndex | null
) {
  const type = block.type === "bulleted_list_group" ? "bulleted" : "numbered";
  return (
    <NotionList
      type={type}
      items={block.items}
      navigationIndex={navigationIndex}
      renderChildren={(children) => (
        <Blocks
          blocks={children}
          currentSlug={currentSlug}
          tocHeadings={toc}
          renderMode={renderMode}
          navigationIndex={navigationIndex}
        />
      )}
    />
  );
}

export async function Blocks({
  blocks,
  currentSlug,
  tocHeadings,
  renderMode,
  navigation,
  navigationIndex,
}: {
  blocks: NotionBlock[];
  currentSlug?: string;
  tocHeadings?: TocEntry[];
  renderMode?: "default" | "day";
  navigation?: NavItem[];
  navigationIndex?: NavigationIndex | null;
}) {
  const headings = tocHeadings ?? collectHeadings(blocks);
  const resolvedNavigationIndex = navigationIndex ?? buildNavigationIndex(navigation);
  const grouped = groupLists(blocks);
  const rendered = await Promise.all(
    grouped.map(async (group, idx) => {
      if ("items" in group) {
        const items = (group as GroupedListBlock).items;
        const key = items[0]?.id ?? `list-${idx}`;
        const node = renderGroupedList(
          group as GroupedListBlock,
          currentSlug,
          headings,
          renderMode,
          resolvedNavigationIndex
        );
        return <Fragment key={key}>{node}</Fragment>;
      }
      const block = group as NotionBlock;
      const key = block.id ?? `block-${idx}`;
      const node = await renderBlockAsync(block, currentSlug, headings, renderMode, resolvedNavigationIndex);
      return <Fragment key={key}>{node}</Fragment>;
    })
  );

  return <>{rendered}</>;
}

export async function renderBlockAsync(
  block: NotionBlock,
  currentSlug?: string,
  toc?: TocEntry[],
  renderMode?: "default" | "day",
  navigationIndex?: NavigationIndex | null
): Promise<ReactNode> {
  const type = (block as { type?: string }).type;

  if (isButtonBlock(block)) {
    const data = block.button;
    if (!data) return null;
    const resolvedHref = resolveInternalHrefFromNotionLink(data.url, navigationIndex) ?? data.url;
    return (
      <NotionButton
        href={resolvedHref}
        label={data.label}
        variant={data.style === "ghost" ? "ghost" : "primary"}
      />
    );
  }

  // widget injection
  if (type === "embed") {
    const embedBlock = block as Extract<NotionBlock, { type: "embed" }>;
    const url = embedBlock.embed?.url;
    if (url) {
      const widget = parseWidget(url);
      if (widget) {
        return renderWidget(widget, { storageKey: currentSlug ?? "notion-widget" });
      }
    }
  }

  if (type === "collection_view" || type === "collection_view_page" || type === "child_database") {
    return await renderCollectionBlock(block, currentSlug);
  }

  switch (type) {
    case "paragraph": {
      const paragraph = (block as Extract<NotionBlock, { type: "paragraph" }>).paragraph;
      const richText = paragraph.rich_text;
      if (!richText?.length) return null;
      const maybeBtn = parseButtonFromRichText(richText);
      if (maybeBtn) {
        const resolvedHref = resolveInternalHrefFromNotionLink(maybeBtn.href, navigationIndex) ?? maybeBtn.href;
        return <NotionButton href={resolvedHref} label={maybeBtn.label} variant={maybeBtn.variant} />;
      }
      return <NotionParagraph richText={richText} navigationIndex={navigationIndex} />;
    }

    case "heading_1":
      return (
        <NotionHeading id={`b-${block.id}`} level={1}>
          <RichText
            prose={false}
            richText={(block as Extract<NotionBlock, { type: "heading_1" }>).heading_1.rich_text}
            navigationIndex={navigationIndex}
          />
        </NotionHeading>
      );
    case "heading_2":
      return (
        <NotionHeading id={`b-${block.id}`} level={2}>
          <RichText
            prose={false}
            richText={(block as Extract<NotionBlock, { type: "heading_2" }>).heading_2.rich_text}
            navigationIndex={navigationIndex}
          />
        </NotionHeading>
      );
    case "heading_3":
      return (
        <NotionHeading id={`b-${block.id}`} level={3}>
          <RichText
            prose={false}
            richText={(block as Extract<NotionBlock, { type: "heading_3" }>).heading_3.rich_text}
            navigationIndex={navigationIndex}
          />
        </NotionHeading>
      );

    case "quote": {
      const quote = (block as Extract<NotionBlock, { type: "quote" }>).quote;
      return <NotionQuote richText={quote.rich_text} tone={quote.color} navigationIndex={navigationIndex} />;
    }

    case "divider":
      return <NotionDivider />;

    case "bulleted_list_item":
    case "numbered_list_item": {
      // grouped via groupLists, individual fallback
      return (
        <NotionList
          type={type === "bulleted_list_item" ? "bulleted" : "numbered"}
          items={[block as Extract<NotionBlock, { type: "bulleted_list_item" | "numbered_list_item" }>]}
          navigationIndex={navigationIndex}
          renderChildren={(children) => (
            <Blocks
              blocks={children}
              currentSlug={currentSlug}
              tocHeadings={toc}
              renderMode={renderMode}
              navigationIndex={navigationIndex}
            />
          )}
        />
      );
    }

    case "to_do": {
      const children = getBlockChildren(block);
      const todo = (block as Extract<NotionBlock, { type: "to_do" }>).to_do;
      return (
        <NotionTodo
          id={`todo-${block.id}`}
          richText={todo.rich_text}
          checked={todo.checked}
          navigationIndex={navigationIndex}
          childrenBlocks={children}
          renderChildren={(blocks) => (
            <Blocks
              blocks={blocks}
              currentSlug={currentSlug}
              tocHeadings={toc}
              renderMode={renderMode}
              navigationIndex={navigationIndex}
            />
          )}
        />
      );
    }

    case "callout": {
      const children = getBlockChildren(block);
      const callout = (block as Extract<NotionBlock, { type: "callout" }>).callout;
      const icon = callout.icon;
      let iconNode: React.ReactNode = undefined;
      if (icon?.type === "emoji") {
        iconNode = icon.emoji;
      } else if (icon?.type === "external") {
        let src = icon.external?.url ?? "";
        // Notion CDN icons : URLs en /icons/xxx.svg → préfixer le host
        if (src.startsWith("/icons/")) src = `https://www.notion.so${src}`;
        if (src) {
          iconNode = (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="callout-icon-img" loading="lazy" />
          );
        }
      } else if (icon?.type === "file" && icon.file?.url) {
        iconNode = (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon.file.url} alt="" className="callout-icon-img" loading="lazy" />
        );
      }
      return (
        <NotionCallout
          icon={iconNode}
          tone={callout.color}
          richText={callout.rich_text}
          navigationIndex={navigationIndex}
        >
          {children.length ? (
            <Blocks
              blocks={children}
              currentSlug={currentSlug}
              tocHeadings={toc}
              renderMode={renderMode}
              navigationIndex={navigationIndex}
            />
          ) : null}
        </NotionCallout>
      );
    }

    case "toggle": {
      const children = getBlockChildren(block);
      const toggle = (block as Extract<NotionBlock, { type: "toggle" }>).toggle;
      return (
        <NotionToggle richText={toggle.rich_text} tone={toggle.color} navigationIndex={navigationIndex}>
          {children.length ? (
            <Blocks
              blocks={children}
              currentSlug={currentSlug}
              tocHeadings={toc}
              renderMode={renderMode}
              navigationIndex={navigationIndex}
            />
          ) : null}
        </NotionToggle>
      );
    }

    case "toggle_heading_1": {
      const toggle = (block as { toggle_heading_1?: { rich_text: RichTextItemResponse[]; color?: string } })
        .toggle_heading_1;
      if (!toggle) return null;
      const children = getBlockChildren(block);
      return (
        <NotionToggleHeading level={1} richText={toggle.rich_text} tone={toggle.color} navigationIndex={navigationIndex}>
          {children.length ? (
            <Blocks
              blocks={children}
              currentSlug={currentSlug}
              tocHeadings={toc}
              renderMode={renderMode}
              navigationIndex={navigationIndex}
            />
          ) : null}
        </NotionToggleHeading>
      );
    }

    case "toggle_heading_2": {
      const toggle = (block as { toggle_heading_2?: { rich_text: RichTextItemResponse[]; color?: string } })
        .toggle_heading_2;
      if (!toggle) return null;
      const children = getBlockChildren(block);
      return (
        <NotionToggleHeading level={2} richText={toggle.rich_text} tone={toggle.color} navigationIndex={navigationIndex}>
          {children.length ? (
            <Blocks
              blocks={children}
              currentSlug={currentSlug}
              tocHeadings={toc}
              renderMode={renderMode}
              navigationIndex={navigationIndex}
            />
          ) : null}
        </NotionToggleHeading>
      );
    }

    case "toggle_heading_3": {
      const toggle = (block as { toggle_heading_3?: { rich_text: RichTextItemResponse[]; color?: string } })
        .toggle_heading_3;
      if (!toggle) return null;
      const children = getBlockChildren(block);
      return (
        <NotionToggleHeading level={3} richText={toggle.rich_text} tone={toggle.color} navigationIndex={navigationIndex}>
          {children.length ? (
            <Blocks
              blocks={children}
              currentSlug={currentSlug}
              tocHeadings={toc}
              renderMode={renderMode}
              navigationIndex={navigationIndex}
            />
          ) : null}
        </NotionToggleHeading>
      );
    }

    case "image": {
      const image = (block as Extract<NotionBlock, { type: "image" }>).image;
      const src = image.type === "external" ? image.external.url : image.file.url;
      const caption = image.caption?.[0]?.plain_text ?? null;
      const meta = (block as { __image_meta?: { width?: number; height?: number; maxWidthPx?: number; align?: "left" | "center" | "right" } }).__image_meta;
      return (
        <NotionImage
          src={src}
          alt={caption}
          caption={caption}
          width={meta?.width ?? null}
          height={meta?.height ?? null}
          maxWidthPx={meta?.maxWidthPx ?? null}
          align={meta?.align}
          withBackground
        />
      );
    }

    case "video": {
      const video = (block as Extract<NotionBlock, { type: "video" }>).video;
      const src = video.type === "external" ? video.external.url : video.file.url;
      const caption = video.caption?.[0]?.plain_text ?? null;
      const yt = parseYouTube(src);
      if (yt) {
        return <NotionEmbed url={yt.embed} title={caption ?? "Vidéo"} caption={caption} />;
      }
      return <NotionVideo src={src} caption={caption} />;
    }

    case "audio": {
      const audio = (block as Extract<NotionBlock, { type: "audio" }>).audio;
      const src = audio.type === "external" ? audio.external.url : audio.file.url;
      const caption = audio.caption?.[0]?.plain_text ?? null;
      if (!src) return null;
      return <NotionAudio src={src} caption={caption} />;
    }

    case "embed": {
      const embed = (block as Extract<NotionBlock, { type: "embed" }>).embed;
      const url = embed?.url ?? "";
      if (!url) return null;
      const caption = embed?.caption?.[0]?.plain_text ?? null;
      const yt = parseYouTube(url);
      if (yt) {
        return <NotionEmbed url={yt.embed} title={caption ?? url} caption={caption} />;
      }
      if (/tally\.so\//i.test(url)) return <NotionTallyEmbed url={url} caption={caption} />;
      if (/airtable\.com\//i.test(url)) return <NotionAirtableEmbed url={url} caption={caption} />;
      if (/\.pdf($|\?)/i.test(url)) return <NotionPdfEmbed url={url} caption={caption} />;
      return <NotionEmbed url={url} title={caption ?? url} caption={caption} />;
    }

    case "bookmark": {
      const bookmark = (block as Extract<NotionBlock, { type: "bookmark" }>).bookmark;
      const url = bookmark?.url ?? "";
      if (!url) return null;
      const caption = bookmark?.caption?.[0]?.plain_text ?? null;
      const yt = parseYouTube(url);
      if (yt) return <NotionEmbed url={yt.embed} title={caption ?? url} caption={caption} />;
      if (/tally\.so\//i.test(url)) return <NotionTallyEmbed url={url} caption={caption} />;
      if (/airtable\.com\//i.test(url)) return <NotionAirtableEmbed url={url} caption={caption} />;
      if (/\.pdf($|\?)/i.test(url)) return <NotionPdfEmbed url={url} caption={caption} />;
      return <NotionBookmark url={url} title={caption ?? url} description={caption ?? undefined} />;
    }

    case "file": {
      const file = (block as Extract<NotionBlock, { type: "file" }>).file;
      const src = file.type === "external" ? file.external.url : file.file.url;
      const caption = file.caption?.[0]?.plain_text ?? null;
      return <NotionFile url={src} caption={caption} />;
    }

    case "code": {
      const codeBlock = (block as Extract<NotionBlock, { type: "code" }>).code;
      const language = (codeBlock.language || "").toLowerCase();
      const codeText = (codeBlock.rich_text ?? [])
        .map((r) => r.plain_text ?? "")
        .join("\n")
        .trim();
      const caption = codeBlock.caption?.[0]?.plain_text ?? null;

      const looksLikeWidget = language === "yaml" || language === "yml" || language === "";

      if (looksLikeWidget) {
        try {
          const widget = parseWidget(codeText);
          if (widget) {
            return (
              <div key={block.id} className="my-[var(--space-m)]">
                {renderWidget(widget, { storageKey: `widget-${block.id}` })}
              </div>
            );
          }
          // Pas de log : un YAML qui ne match aucun widget tombe juste en code block.
        } catch (error) {
          console.error("[notion-widget] YAML parse error", { blockId: block.id, language }, error);
        }
      }

      if (language === "html") {
        return <NotionHtml html={codeText} caption={caption} />;
      }

      return <NotionCode code={codeText} language={codeBlock.language} caption={caption} />;
    }

    case "equation": {
      const eq = (block as Extract<NotionBlock, { type: "equation" }>).equation;
      return <NotionEquation expression={eq.expression} />;
    }

    case "table": {
      const table = (block as Extract<NotionBlock, { type: "table" }>).table;
      const children = getBlockChildren(block);
      const rows = children
        .filter((child) => (child as { type?: string }).type === "table_row")
        .map((row) => (row as Extract<NotionBlock, { type: "table_row" }>).table_row.cells);
      return (
        <NotionTable
          rows={rows}
          hasColumnHeader={table.has_column_header}
          hasRowHeader={table.has_row_header}
          navigationIndex={navigationIndex}
        />
      );
    }

    case "column_list": {
      const columnRatios = (block as { __column_ratios?: number[] }).__column_ratios;
      const columns = getBlockChildren(block).map((col) => (
        <Blocks
          key={col.id}
          blocks={getBlockChildren(col)}
          currentSlug={currentSlug}
          tocHeadings={toc}
          renderMode={renderMode}
          navigationIndex={navigationIndex}
        />
      ));
      return <NotionColumns columns={columns} ratios={columnRatios} />;
    }

    case "column":
      return (
        <Blocks
          blocks={getBlockChildren(block)}
          currentSlug={currentSlug}
          tocHeadings={toc}
          renderMode={renderMode}
          navigationIndex={navigationIndex}
        />
      );

    case "synced_block":
      return (
        <Blocks
          blocks={getBlockChildren(block)}
          currentSlug={currentSlug}
          tocHeadings={toc}
          renderMode={renderMode}
          navigationIndex={navigationIndex}
        />
      );

    case "table_of_contents":
      return <NotionTableOfContents entries={toc ?? []} />;

    case "breadcrumb":
      return <NotionBreadcrumb items={(toc ?? []).map((h) => ({ title: h.title }))} />;

    case "child_page": {
      const childPage = block as Extract<NotionBlock, { type: "child_page" }>;
      const title = childPage.child_page?.title ?? block.id ?? "child_page";
      const navLink = resolveNavigationLink(navigationIndex, block.id);
      const fallbackSlug = currentSlug ? `${currentSlug.replace(/\/+$/, "")}/${slugify(title)}` : null;
      const slug = navLink?.slug ?? fallbackSlug;
      if (!slug) return null;
      return renderInternalPageLink({ slug, title: navLink?.title ?? title, icon: navLink?.icon ?? null });
    }

    case "link_to_page": {
      const linkBlock = block as Extract<NotionBlock, { type: "link_to_page" }>;
      const link = linkBlock.link_to_page;
      if (link?.type !== "page_id" || !link.page_id) return null;
      const navLink = resolveNavigationLink(navigationIndex, link.page_id);
      if (!navLink?.slug) return null;
      return renderInternalPageLink({ slug: navLink.slug, title: navLink.title, icon: navLink.icon ?? null });
    }

    default:
      // Unsupported or inline types
      if (MEDIA_BLOCKS.has(type as NotionBlock["type"])) return null;
      return renderUnknown(type ?? "unknown");
  }

}
