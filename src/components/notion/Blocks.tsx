import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";

import { NotionCollectionView } from "@/components/notion/CollectionView";
import { resolveDatabaseIdFromBlock } from "@/lib/resolve-db-id";
import type { LinkedDatabaseBlock } from "@/lib/resolve-db-id";

import type { NotionBlock } from "@/lib/notion";
import { groupLists, type GroupedListBlock, type ListBlock, type RenderableBlock } from "./utils";

/**
 * 🔧 Hooks CSS (pilotés par globals.css)
 * .rt-strong, .rt-em, .rt-underline, .rt-strike, .rt-code, .rt-link
 * .rt-mark  + [data-color="blue|brown|gray|green|orange|pink|purple|red|yellow|teal"]
 * .callout, .toggle, .todo, .media-figure, .bookmark, .table-wrap
 */

const MEDIA_BLOCKS = new Set<NotionBlock["type"]>([
  "image",
  "video",
  "file",
  "pdf",
  "bookmark",
  "embed",
  "audio",
  "equation",
]);

type AugmentedBlock = NotionBlock & {
  __children?: NotionBlock[];
  __synced_unresolved?: boolean;
  __synced_unshared?: boolean;
};

type ButtonBlock = Extract<NotionBlock, { type: 'button' }>;

function isButtonBlock(block: NotionBlock): block is ButtonBlock {
  return (block as { type?: string }).type === 'button';
}

function getBlockChildren(block: NotionBlock): NotionBlock[] {
  return (block as AugmentedBlock).__children ?? [];
}

function isGroupedListBlock(block: RenderableBlock): block is GroupedListBlock {
  return "items" in block;
}

function notionColorAttr(color?: string | null) {
  return color && color !== 'default' ? color : undefined;
}

function notionColorTone(color?: string | null) {
  if (!color || color === 'default') return undefined;
  return color.replace('_background', '');
}

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toUuid(id?: string | null): string | null {
  if (!id) return null;
  const clean = id.replace(/-/g, '');
  if (clean.length !== 32) return id;
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
}

function extractPlainText(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (Array.isArray(value)) {
    const text = value
      .map((entry) => (Array.isArray(entry) && typeof entry[0] === 'string' ? entry[0] : ''))
      .join('')
      .trim();
    return text || null;
  }
  return null;
}

function extractCollectionIds(record: AnyRecord): string[] {
  const ids = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) {
      ids.add(value.trim());
    }
  };

  add(record.collection_id);
  add(record.collectionId);

  const collection = isRecord(record.collection) ? (record.collection as AnyRecord) : null;
  if (collection) {
    add(collection.id);
    add(collection.collection_id);
    const pointer = isRecord(collection.collection_pointer)
      ? (collection.collection_pointer as AnyRecord)
      : isRecord((collection as { pointer?: unknown }).pointer)
      ? ((collection as { pointer?: unknown }).pointer as AnyRecord)
      : null;
    if (pointer) {
      add(pointer.id);
    }
  }

  const format = isRecord(record.format) ? (record.format as AnyRecord) : null;
  if (format) {
    const pointer = isRecord(format.collection_pointer)
      ? (format.collection_pointer as AnyRecord)
      : isRecord((format as { collectionPointer?: unknown }).collectionPointer)
      ? ((format as { collectionPointer?: unknown }).collectionPointer as AnyRecord)
      : null;
    if (pointer) {
      add(pointer.id);
    }
  }

  const linkedDb = isRecord(record.linked_db) ? (record.linked_db as AnyRecord) : null;
  if (linkedDb) {
    add(linkedDb.database_id);
  }

  const linkToPage = isRecord(record.link_to_page) ? (record.link_to_page as AnyRecord) : null;
  if (linkToPage?.type === 'database_id' && typeof linkToPage.database_id === 'string') {
    add(linkToPage.database_id);
  }

  if (record.type === 'child_database' && typeof record.id === 'string') {
    add(record.id);
  }

  return Array.from(ids);
}

function extractViewIds(record: AnyRecord): string[] {
  const ids = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) {
      ids.add(value.trim());
    }
  };
  const addMany = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(add);
    }
  };

  add(record.view_id);
  add(record.viewId);
  addMany(record.view_ids);
  addMany(record.viewIds);

  const format = isRecord(record.format) ? (record.format as AnyRecord) : null;
  if (format) {
    add(format.view_id);
    add(format.viewId);
    addMany(format.view_ids);
    addMany(format.viewIds);

    const pointer = isRecord(format.collection_view)
      ? (format.collection_view as AnyRecord)
      : isRecord((format as { collectionView?: unknown }).collectionView)
      ? ((format as { collectionView?: unknown }).collectionView as AnyRecord)
      : null;
    if (pointer) {
      add(pointer.view_id);
      add(pointer.viewId);
      addMany(pointer.view_ids);
      addMany(pointer.viewIds);
    }

    const altPointer = isRecord(format.collection_pointer)
      ? (format.collection_pointer as AnyRecord)
      : isRecord((format as { collectionPointer?: unknown }).collectionPointer)
      ? ((format as { collectionPointer?: unknown }).collectionPointer as AnyRecord)
      : null;
    if (altPointer) {
      add(altPointer.view_id);
      add(altPointer.viewId);
      addMany(altPointer.view_ids);
      addMany(altPointer.viewIds);
    }
  }

  const collectionView = isRecord(record.collection_view) ? (record.collection_view as AnyRecord) : null;
  if (collectionView) {
    add(collectionView.view_id);
    add(collectionView.viewId);
    addMany(collectionView.view_ids);
    addMany(collectionView.viewIds);
  }

  return Array.from(ids);
}

function extractCollectionTitle(record: AnyRecord): string | null {
  const childDb = isRecord(record.child_database) ? (record.child_database as AnyRecord) : null;
  if (childDb && typeof childDb.title === 'string' && childDb.title.trim()) {
    return childDb.title.trim();
  }

  const collectionView = isRecord(record.collection_view) ? (record.collection_view as AnyRecord) : null;
  if (collectionView) {
    const name = extractPlainText(collectionView.name);
    if (name) return name;
  }

  const format = isRecord(record.format) ? (record.format as AnyRecord) : null;
  if (format) {
    const viewRef = isRecord(format.collection_view)
      ? (format.collection_view as AnyRecord)
      : isRecord((format as { collectionView?: unknown }).collectionView)
      ? ((format as { collectionView?: unknown }).collectionView as AnyRecord)
      : null;
    if (viewRef) {
      const name = extractPlainText(viewRef.name);
      if (name) return name;
    }
  }

  const collection = isRecord(record.collection) ? (record.collection as AnyRecord) : null;
  if (collection) {
    const name = extractPlainText(collection.name);
    if (name) return name;
  }

  if (isRecord(record.properties)) {
    const properties = record.properties as AnyRecord;
    const titleProp = properties.title;
    const name = extractPlainText(titleProp);
    if (name) return name;
  }

  return null;
}

async function resolveCollectionContext(block: NotionBlock): Promise<{
  databaseId: string | null;
  viewId: string | null;
  title: string | null;
}> {
  const record = block as unknown as AnyRecord;
  const rawViewId = extractViewIds(record)[0] ?? null;
  const rawIds = extractCollectionIds(record);
  let databaseId: string | null = null;
  if (rawIds.length) {
    databaseId = toUuid(rawIds[0]);
  }
  if (!databaseId) {
    databaseId = await resolveDatabaseIdFromBlock(block as LinkedDatabaseBlock);
  }
  const title = extractCollectionTitle(record);

  return {
    databaseId,
    viewId: rawViewId ?? null,
    title,
  };
}

async function renderCollectionBlock(block: NotionBlock, currentSlug?: string) {
  const context = await resolveCollectionContext(block);
  if (!context.databaseId) return null;
  return (
    <div className="my-8">
      <NotionCollectionView
        databaseId={context.databaseId}
        viewId={context.viewId ?? undefined}
        title={context.title ?? undefined}
        basePath={currentSlug ? `/${currentSlug}` : ""}
      />
    </div>
  );
}

function getInlineClasses(item: RichTextItemResponse): string {
  const a = item.annotations ?? {};
  const classes = [
    a.bold ? "rt-strong font-semibold" : "",
    a.italic ? "rt-em italic" : "",
    a.underline ? "rt-underline underline decoration-dotted underline-offset-4" : "",
    a.strikethrough ? "rt-strike line-through" : "",
    a.code ? "rt-code rounded px-1.5 py-0.5 font-mono text-xs uppercase tracking-wide" : "",
  ];
  return classes.filter(Boolean).join(" ");
}

function getInlineAttrs(item: RichTextItemResponse) {
  // Donne un hook neutre au marquage couleur, sans imposer une palette Tailwind.
  // Tu pourras styler dans globals.css via `.rt-mark[data-color="blue"] { ... }`
  const a: Partial<RichTextItemResponse["annotations"]> = item.annotations ?? {};
  const attrs: Record<string, string> = {};
  const color = a.color;
  if (color && color !== "default") {
    // Notion envoie "blue" ou "blue_background"
    if (color.endsWith("_background")) {
      attrs["data-bg"] = color.replace("_background", "");
    } else {
      attrs["data-color"] = color;
    }
  }
  return attrs;
}

function countRichTextCharacters(items: RichTextItemResponse[] | undefined): number {
  return (items ?? []).reduce((acc, item) => acc + (item.plain_text?.length ?? 0), 0);
}

function blockTextLength(block: NotionBlock): number {
  switch (block.type) {
    case "paragraph":
      return countRichTextCharacters(block.paragraph.rich_text);
    case "heading_1":
      return countRichTextCharacters(block.heading_1.rich_text);
    case "heading_2":
      return countRichTextCharacters(block.heading_2.rich_text);
    case "heading_3":
      return countRichTextCharacters(block.heading_3.rich_text);
    case "quote":
      return countRichTextCharacters(block.quote.rich_text);
    case "bulleted_list_item":
      return (
        countRichTextCharacters(block.bulleted_list_item.rich_text) +
        (getBlockChildren(block).reduce((acc, child) => acc + blockTextLength(child), 0) ?? 0)
      );
    case "numbered_list_item":
      return (
        countRichTextCharacters(block.numbered_list_item.rich_text) +
        (getBlockChildren(block).reduce((acc, child) => acc + blockTextLength(child), 0) ?? 0)
      );
    case "to_do":
      return (
        countRichTextCharacters(block.to_do.rich_text) +
        (getBlockChildren(block).reduce((acc, child) => acc + blockTextLength(child), 0) ?? 0)
      );
    case "callout":
      return (
        countRichTextCharacters(block.callout.rich_text) +
        (getBlockChildren(block).reduce((acc, child) => acc + blockTextLength(child), 0) ?? 0)
      );
    case "toggle":
      return (
        countRichTextCharacters(block.toggle.rich_text) +
        (getBlockChildren(block).reduce((acc, child) => acc + blockTextLength(child), 0) ?? 0)
      );
    case "synced_block":
    case "column":
    case "column_list":
    case "table":
      return getBlockChildren(block).reduce((acc, child) => acc + blockTextLength(child), 0) ?? 0;
    case "table_row":
      return block.table_row.cells.reduce((acc, cell) => acc + countRichTextCharacters(cell), 0);
    default:
      return 0;
  }
}

function renderRichText(items: RichTextItemResponse[] | undefined): ReactNode {
  if (!items || items.length === 0) return null;

  return items.map((item, index) => {
    const key = `${item.plain_text ?? item.type}-${index}`;
    const classes = getInlineClasses(item);
    const attrs = getInlineAttrs(item);
    const text =
      item.type === "equation"
        ? item.equation.expression
        : item.plain_text ?? item.href ?? "";

    // lien (la couleur/hover sera gérée par .rt-link dans globals.css)
    if (item.href && !item.annotations.code) {
      return (
        <a
          key={key}
          href={item.href}
          className={`rt-link ${classes}`.trim()}
          rel="noreferrer"
          {...attrs}
        >
          {text}
        </a>
      );
    }

    // code inline (styles via .rt-code)
    if (item.annotations.code) {
      return (
        <code key={key} className={classes} {...attrs}>
          {text}
        </code>
      );
    }

    // span standard (marquage couleur via data-attrs)
    return (
      <span key={key} className={`rt-mark ${classes}`.trim()} {...attrs}>
        {text}
      </span>
    );
  });
}

// Try to interpret a paragraph made of a single link as a Button.
// Heuristic: all rich_text segments have an href (one single link visually in Notion),
// optional token in the label like {btn}, {btn:primary}, {btn:ghost} to force rendering.
function parseButtonFromRichText(items: RichTextItemResponse[] | undefined):
  | { href: string; label: string; variant: 'primary' | 'ghost' }
  | null {
  if (!items || items.length === 0) return null;

  const labelRaw = items.map((i) => i.plain_text ?? '').join('');
  const tokenMatch = /\{btn(?::(primary|ghost))?\}/i.exec(labelRaw);
  const hasBtnToken = !!tokenMatch;

  // Accept either an explicit token OR exactly one link anywhere in the paragraph
  const linkItems = items.filter((i) => !!i.href);
  if (!hasBtnToken && linkItems.length !== 1) return null;

  const href = (linkItems[0] ?? items[0])?.href;
  if (!href) return null;

  // Decide variant based on token or color annotations
  let variant: 'primary' | 'ghost' = (tokenMatch?.[1] as 'primary' | 'ghost') || 'primary';
  if (!tokenMatch) {
    const hasGrayTone = linkItems.some((i) => (i.annotations?.color ?? 'default').startsWith('gray'));
    if (hasGrayTone) variant = 'ghost';
  }

  // Clean label (strip token)
  // If there was no token, prefer the linked segment's label to avoid stray emoji around it.
  const baseLabel = tokenMatch ? labelRaw : (linkItems[0]?.plain_text ?? labelRaw);
  const label = baseLabel.replace(/\{btn(?::(primary|ghost))?\}/ig, '').trim();
  if (!label) return null;

  return { href, label, variant };
}

function renderListItems(items: ListBlock[], currentSlug?: string): ReactNode {
  return items.map((item) => (
    <li key={item.id} className="space-y-2.5 text-[0.98rem] leading-[1.65]">
      <div>
        {renderRichText(
          item.type === "bulleted_list_item"
            ? item.bulleted_list_item.rich_text
            : item.numbered_list_item.rich_text
        )}
      </div>
      {getBlockChildren(item as NotionBlock).length ? (
        <div className="pl-5 text-[0.92rem]">
          <Blocks blocks={getBlockChildren(item as NotionBlock)} currentSlug={currentSlug} />
        </div>
      ) : null}
    </li>
  ));
}

function renderGrouped(block: GroupedListBlock, currentSlug?: string): ReactNode {
  const Component = (block.type === "bulleted_list_group" ? "ul" : "ol") as "ul" | "ol";
  const markerClass = block.type === "bulleted_list_group" ? "list-disc" : "list-decimal";

  return (
    <Component className={`space-y-2.5 pl-6 ${markerClass} text-[0.98rem] leading-[1.65]`}>
      {renderListItems(block.items, currentSlug)}
    </Component>
  );
}

function renderMedia({
  url,
  caption,
  size,
}: {
  url: string;
  caption?: string | null;
  size?: { width?: number; height?: number; maxWidthPx?: number; align?: 'left' | 'center' | 'right' };
}): ReactNode {
  const naturalWidth = size?.width;
  const naturalHeight = size?.height;
  const maxWidthPx = size?.maxWidthPx ?? naturalWidth ?? 720;
  const align = size?.align ?? 'center';

  const figureStyle: React.CSSProperties = { maxWidth: `${maxWidthPx}px` };
  if (align === 'left') {
    figureStyle.marginInlineStart = '0';
    figureStyle.marginInlineEnd = 'auto';
  } else if (align === 'right') {
    figureStyle.marginInlineStart = 'auto';
    figureStyle.marginInlineEnd = '0';
  }

  return (
    <figure
      className="media-figure inline-block max-w-full overflow-hidden rounded-[22px] border p-0"
      style={figureStyle}
    >
      <Image
        src={url}
        alt={caption ?? ""}
        width={naturalWidth ?? 1600}
        height={naturalHeight ?? 900}
        sizes="100vw"
        className="object-contain"
        style={{ width: '100%', height: 'auto', display: 'block' }}
        loading="lazy"
      />
      {caption ? <figcaption className="px-6 pb-4 pt-3 text-sm text-[0.95rem]">{caption}</figcaption> : null}
    </figure>
  );
}


export async function renderBlockAsync(block: NotionBlock, currentSlug?: string): Promise<ReactNode> {
  const blockType = (block as { type?: string }).type;

  if (blockType === 'collection_view' || blockType === 'collection_view_page') {
    return await renderCollectionBlock(block, currentSlug);
  }

  if (isButtonBlock(block)) {
    const data = block.button;
    if (!data) return null;
    const cls = `btn ${data.style === 'ghost' ? 'btn-ghost' : 'btn-primary'}`;
    return (
      <div>
        <a href={data.url} className={cls} rel="noreferrer">
          {data.label}
        </a>
      </div>
    );
  }

  switch (block.type) {
    case "paragraph": {
      const richText = block.paragraph.rich_text;
      if (!richText || richText.length === 0) {
        return <div className="h-5" />;
      }
      const maybeBtn = parseButtonFromRichText(richText);
      if (maybeBtn) {
        const cls = `btn ${maybeBtn.variant === 'primary' ? 'btn-primary' : 'btn-ghost'}`;
        return (
          <div>
            <a className={cls} href={maybeBtn.href} rel="noreferrer">
              {maybeBtn.label}
            </a>
          </div>
        );
      }
      return <p className="text-[1.02rem] leading-[1.68] tracking-[0.002em]">{renderRichText(richText)}</p>;
    }

    case "heading_1":
      return (
        <h1 className="text-[2.25rem] font-semibold leading-[1.2] tracking-[-0.015em]">
          {renderRichText(block.heading_1.rich_text)}
        </h1>
      );

    case "heading_2":
      return (
        <h2 className="text-[1.75rem] font-semibold leading-[1.28] tracking-[-0.01em]">
          {renderRichText(block.heading_2.rich_text)}
        </h2>
      );

    case "heading_3":
      return (
        <h3 className="text-[1.45rem] font-semibold leading-[1.28] tracking-[-0.01em]">
          {renderRichText(block.heading_3.rich_text)}
        </h3>
      );

    case "quote":
      return (
        <blockquote className="quote text-[1.05rem] leading-[1.7] italic">
          {renderRichText(block.quote.rich_text)}
        </blockquote>
      );

    case "to_do": {
      const tone = notionColorTone(block.to_do.color);
      const colorAttr = notionColorAttr(block.to_do.color);
      return (
        <label
          className="todo flex items-start gap-3 rounded-[20px] border px-5 py-4 text-[0.98rem] leading-[1.6]"
          data-todo-color={colorAttr}
          data-todo-tone={tone}
        >
          <span
            className={`mt-1 inline-flex h-5 w-5 items-center justify-center rounded-md border text-[0.75rem] font-semibold`}
            data-checked={block.to_do.checked ? "true" : "false"}
          >
            {block.to_do.checked ? <span aria-hidden>✓</span> : null}
          </span>
          <span className={block.to_do.checked ? "line-through opacity-55" : undefined}>
            {renderRichText(block.to_do.rich_text)}
          </span>
          {getBlockChildren(block).length ? (
            <div className="mt-3 w-full space-y-3 text-[0.92rem]">
              <Blocks blocks={getBlockChildren(block)} currentSlug={currentSlug} />
            </div>
          ) : null}
        </label>
      );
    }

    case "toggle": {
      const tone = notionColorTone(block.toggle.color);
      const colorAttr = notionColorAttr(block.toggle.color);
      return (
        <details
          className="toggle group rounded-[20px] border px-5 py-4 transition"
          data-toggle-color={colorAttr}
          data-toggle-tone={tone}
        >
          <summary className="flex cursor-pointer items-center justify-between gap-4 text-[0.98rem] font-medium leading-[1.6]">
            <span>{renderRichText(block.toggle.rich_text)}</span>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm transition group-open:rotate-45">
              +
            </span>
          </summary>
          {getBlockChildren(block).length ? (
            <div className="mt-4 space-y-3 text-[0.95rem]">
              <Blocks blocks={getBlockChildren(block)} currentSlug={currentSlug} />
            </div>
          ) : null}
        </details>
      );
    }

    case "image": {
      const image = block.image;
      const src = image.type === "external" ? image.external.url : image.file.url;
      const caption = image.caption?.[0]?.plain_text ?? null;
      const meta = (block as unknown as {
        __image_meta?: { width?: number; height?: number; maxWidthPx?: number; align?: 'left' | 'center' | 'right' };
      }).__image_meta;
      return renderMedia({ url: src, caption, size: meta });
    }

    case "video": {
      const video = block.video;
      const src = video.type === "external" ? video.external.url : video.file.url;
      return (
        <div className="media-figure mx-auto max-w-3xl overflow-hidden rounded-[22px] border">
          <video controls className="h-auto w-full" src={src} preload="metadata">
            {video.caption?.[0]?.plain_text ?? "Votre navigateur ne supporte pas les vidéos intégrées."}
          </video>
        </div>
      );
    }

    case "code":
      return (
        <pre className="code-block rounded-[22px] border px-6 py-5 text-[0.95rem] leading-[1.5]">
          <code>{block.code.rich_text?.[0]?.plain_text}</code>
        </pre>
      );

    case "callout": {
      const icon = block.callout.icon?.type === "emoji" ? block.callout.icon.emoji : null;
      const tone = notionColorTone(block.callout.color);
      const colorAttr = notionColorAttr(block.callout.color);
      return (
        <div
          className="callout rounded-[22px] border px-6 py-5"
          data-callout-color={colorAttr}
          data-callout-tone={tone}
        >
          <div className="flex items-start gap-3">
            {icon ? (
              <span className="text-2xl" aria-hidden>
                {icon}
              </span>
            ) : null}
            <div className="space-y-3 text-[0.98rem] leading-[1.6]">
              <div>{renderRichText(block.callout.rich_text)}</div>
              {getBlockChildren(block).length ? <Blocks blocks={getBlockChildren(block)} currentSlug={currentSlug} /> : null}
            </div>
          </div>
        </div>
      );
    }

    case "child_database":
    case "link_to_page":
    {
      return await renderCollectionBlock(block, currentSlug);
    }

    case "bookmark":
      return (
        <a
          href={block.bookmark.url}
          className="bookmark block rounded-[20px] border px-6 py-5 transition hover:-translate-y-0.5 hover:shadow-lg"
          rel="noreferrer"
        >
          <div className="text-sm font-semibold text-[0.95rem]">{block.bookmark.url}</div>
          {block.bookmark.caption?.length ? (
            <p className="mt-2 text-sm text-[0.95rem] leading-[1.6]">{block.bookmark.caption[0]?.plain_text}</p>
          ) : null}
        </a>
      );

    case "synced_block": {
      const augmented = block as AugmentedBlock;
      if (augmented.__synced_unresolved) {
        return (
          <div className="my-4 rounded-xl border p-3 text-sm" data-variant="warning">
            Contenu synchronisé introuvable. Vérifie la source de ce bloc dans Notion.
          </div>
        );
      }

      if (augmented.__synced_unshared) {
        return (
          <div className="my-4 rounded-xl border p-3 text-sm" data-variant="warning">
            Contenu synchronisé non accessible à l’intégration. Partage la page source avec ton API bot.
          </div>
        );
      }

      const children = getBlockChildren(augmented);
      return children.length ? <Blocks blocks={children} currentSlug={currentSlug} /> : null;
    }

    case "column_list": {
      const columns = getBlockChildren(block).filter(
        (child): child is NotionBlock & { type: "column" } => child.type === "column"
      );

      const getNumeric = (input: unknown): number | null => {
        if (typeof input === "number" && Number.isFinite(input) && input > 0) {
          return input;
        }
        if (typeof input === "string") {
          const cleaned = input.endsWith("%") ? input.slice(0, -1) : input;
          const numeric = parseFloat(cleaned);
          if (Number.isFinite(numeric) && numeric > 0) {
            return input.endsWith("%") ? numeric / 100 : numeric;
          }
        }
        return null;
      };

      const extractWeight = (columnBlock: NotionBlock): number => {
        const candidates: Array<unknown> = [];
        type UnknownRecord = Record<string, unknown>;
        const anyColumn = columnBlock as unknown as UnknownRecord;

        candidates.push(anyColumn.width, anyColumn.ratio, anyColumn.proportion);
        candidates.push(anyColumn.column_width, anyColumn.column_ratio);

        const formatData = (anyColumn.format ?? {}) as UnknownRecord;
        candidates.push(formatData.column_width, formatData.column_ratio, formatData.ratio);

        const columnData = (anyColumn.column ?? {}) as UnknownRecord;
        candidates.push(
          columnData.width,
          columnData.ratio,
          columnData.proportion,
          columnData.column_width,
          columnData.column_ratio,
          columnData.columnWidth
        );

        for (const candidate of candidates) {
          const numeric = getNumeric(candidate);
          if (numeric !== null) {
            return numeric;
          }
        }

        const children = getBlockChildren(columnBlock);
        const textLength = children.reduce((acc, child) => acc + blockTextLength(child), 0);
        const hasMedia = children.some((child) => MEDIA_BLOCKS.has(child.type));
        const blockCount = children.length;

        const base = 1 + Math.min(textLength / 900, 0.9);
        const mediaBoost = hasMedia ? 0.35 : 0;
        const density = blockCount > 3 ? Math.min((blockCount - 3) * 0.08, 0.4) : 0;

        return base + mediaBoost + density;
      };

      const forced = (block as unknown as { __column_ratios?: number[] }).__column_ratios;
      let template: string;
      if (Array.isArray(forced) && forced.length === columns.length) {
        template = forced.map((ratio) => `${Math.max(ratio, 0.01).toFixed(3)}fr`).join(" ");
      } else {
        const weights = columns.map(extractWeight);
        const total = weights.reduce((acc, weight) => acc + weight, 0) || columns.length || 1;
        template = weights
          .map((weight) => {
            const ratio = weight / total;
            return `${ratio.toFixed(3)}fr`;
          })
          .join(" ");
      }

      const style = {
        "--columns": columns.length.toString(),
        "--column-template": template || undefined,
      } as CSSProperties;

      return (
        <div className="notion-columns" style={style}>
          {columns.map((column) => (
            <div key={column.id} className="space-y-5">
              {getBlockChildren(column).length ? <Blocks blocks={getBlockChildren(column)} currentSlug={currentSlug} /> : null}
            </div>
          ))}
        </div>
      );
    }

    case "divider":
      return <hr className="hr" />;

    case "table": {
      const rows = getBlockChildren(block).filter(
        (child): child is NotionBlock & { type: "table_row" } => child.type === "table_row"
      );

      if (!rows?.length) return null;

      return (
        <div className="table-wrap overflow-hidden rounded-[20px] border">
          <table className="min-w-full divide-y text-[0.95rem]">
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="divide-x">
                  {row.table_row.cells.map((cell, index) => (
                    <td key={`${row.id}-${index}`} className="px-5 py-3.5 align-top">
                      {renderRichText(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    default:
      return null;
  }
}

export async function Blocks({ blocks, currentSlug }: { blocks: NotionBlock[]; currentSlug?: string }) {
  const grouped = groupLists(blocks);

  const rendered = await Promise.all(
    grouped.map(async (block) => {
      if (isGroupedListBlock(block)) {
        const firstId = block.items[0]?.id ?? "list";
        return <div key={`${block.type}-${firstId}`}>{renderGrouped(block, currentSlug)}</div>;
      }
      const notionBlock = block as NotionBlock;
      const content = await renderBlockAsync(notionBlock, currentSlug);
      return <div key={notionBlock.id}>{content}</div>;
    })
  );

  // prose = styles tipographiques par défaut (light)
  return <div className="prose max-w-none space-y-5">{rendered}</div>;
}
