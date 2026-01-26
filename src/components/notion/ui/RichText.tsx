import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";
import Link from "next/link";

type Props = {
  richText: RichTextItemResponse[] | undefined;
  prose?: boolean;
  className?: string;
  navigationIndex?: NavigationIndex | null;
};

export type NavigationIndex = ReadonlyMap<string, { slug: string; title: string; icon?: string | null; id?: string }>;

const NOTION_PAGE_ID_RE = /([0-9a-f]{32})/i;
const NOTION_PAGE_UUID_RE = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

function canonicalizeId(value?: string | null): string {
  return (value ?? "").replace(/-/g, "").toLowerCase();
}

function extractNotionPageId(href: string): string | null {
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
  return Boolean(extractNotionPageId(href));
}

function normalizeInternalHref(slug: string) {
  const trimmed = slug.replace(/^\/+/, "");
  return trimmed ? `/${trimmed}` : "/";
}

function Mention({
  item,
  resolveInternalHref,
}: {
  item: Extract<RichTextItemResponse, { type: "mention" }>;
  resolveInternalHref: (pageId: string) => string | null;
}) {
  const { mention, plain_text } = item;
  const label = plain_text || "mention";
  if (mention.type === "page") {
    const href = resolveInternalHref(mention.page.id);
    if (href) {
      return (
        <Link href={href} className="rt rt-link">
          {label}
        </Link>
      );
    }
    return <span className="rt">{label}</span>;
  }
  if (mention.type === "date") {
    const dateVal = mention.date?.start;
    const formatted = dateVal ? new Date(dateVal).toLocaleDateString("fr-FR") : label;
    return <span className="rt">{formatted}</span>;
  }
  return <span className="rt">{label}</span>;
}

export function RichText({ richText, prose = true, className, navigationIndex }: Props) {
  if (!richText || richText.length === 0) return null;

  const resolveInternalHref = (pageId: string) => {
    if (!pageId) return null;
    const normalized = canonicalizeId(pageId);
    const navLink = navigationIndex?.get(normalized);
    if (navLink?.slug) return normalizeInternalHref(navLink.slug);
    return null;
  };

  const wrapperClass = [
    prose && "prose prose-notion prose-inline",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={wrapperClass || undefined}>
      {richText.map((item, idx) => {
        const key = `${item.plain_text ?? item.type}-${idx}`;
        const { annotations } = item;
        const tone = annotations?.color ?? "default";
        const isBg = tone.endsWith("_background");
        const colorTone = tone.replace("_background", "");
        const toneClass = isBg ? `rt-bg-${colorTone}` : `rt-color-${colorTone}`;
        const classes = [
          "rt",
          annotations?.bold && "rt-bold",
          annotations?.italic && "rt-italic",
          annotations?.underline && "rt-underline",
          annotations?.strikethrough && "rt-strike",
          annotations?.code && "rt-code",
          toneClass,
        ]
          .filter(Boolean)
          .join(" ");

        if (item.type === "text") {
          const content = item.text?.content ?? "";
          const href = item.href ?? item.text?.link?.url;
          if (href) {
            const notionPageId = isNotionUrl(href) || isNotionPath(href) ? extractNotionPageId(href) : null;
            const internalHref = notionPageId ? resolveInternalHref(notionPageId) : null;
            if (internalHref) {
              return (
                <Link key={key} href={internalHref} className={`${classes} rt-link`}>
                  {content}
                </Link>
              );
            }
            return (
              <a key={key} href={href} className={`${classes} rt-link`} rel="noreferrer" target="_blank">
                {content}
              </a>
            );
          }
          return (
            <span key={key} className={classes}>
              {content}
            </span>
          );
        }

        if (item.type === "mention") {
          return <Mention key={key} item={item} resolveInternalHref={resolveInternalHref} />;
        }

        if (item.type === "equation") {
          return (
            <code key={key} className={`${classes} rt-code`}>
              {item.equation.expression}
            </code>
          );
        }

        const fallback = (item as { plain_text?: string }).plain_text ?? "";
        return (
          <span key={key} className={classes}>
            {fallback}
          </span>
        );
      })}
    </span>
  );
}
