import { Blocks } from "@/components/notion/Blocks";
import type { NotionBlock, NotionButtonBlock } from "@/lib/notion";
import { HeroFloatingLinesBackground } from "../HeroFloatingLinesBackground";
import type { MarketingSectionProps } from "./types";

const MEDIA_TYPES = new Set<NotionBlock["type"]>([
  "image",
  "video",
  "file",
  "embed",
] as Array<NotionBlock["type"]>);

function splitContentAndMedia(blocks: NotionBlock[]) {
  const content: NotionBlock[] = [];
  const media: NotionBlock[] = [];

  for (const block of blocks) {
    if (MEDIA_TYPES.has(block.type)) {
      media.push(block);
    } else {
      content.push(block);
    }
  }

  return { content, media };
}

type CTA = { href: string; label: string };

const richTextToPlain = (rich: { plain_text?: string }[] | undefined) =>
  (rich ?? [])
    .map((r) => r.plain_text ?? "")
    .join("")
    .trim();

const HEADING_TYPES = new Set<NotionBlock["type"]>([
  "heading_1",
  "heading_2",
  "heading_3",
  "toggle_heading_1",
  "toggle_heading_2",
  "toggle_heading_3",
] as Array<NotionBlock["type"]>);

function extractFirstHeadings(
  blocks: NotionBlock[]
): { first: string | null; second: string | null; remaining: NotionBlock[] } {
  let first: string | null = null;
  let second: string | null = null;
  const remaining: NotionBlock[] = [];

  for (const block of blocks) {
    if (HEADING_TYPES.has(block.type as NotionBlock["type"])) {
      const key = block.type as keyof typeof block;
      const rich = (block as { [k: string]: { rich_text?: { plain_text?: string }[] } | undefined })[key]?.rich_text;
      const text = richTextToPlain(rich as { plain_text?: string }[] | undefined);
      if (text) {
        if (!first) {
          first = text;
          continue;
        }
        if (!second) {
          second = text;
          continue;
        }
      }
    }
    remaining.push(block);
  }

  return { first, second, remaining };
}

function extractFirstParagraph(
  blocks: NotionBlock[]
): { firstParagraph: string | null; remaining: NotionBlock[] } {
  let firstParagraph: string | null = null;
  const remaining: NotionBlock[] = [];

  for (const block of blocks) {
    if (!firstParagraph && block.type === "paragraph") {
      const paragraph = (block as { paragraph?: { rich_text?: { plain_text?: string }[] } }).paragraph;
      const text = richTextToPlain(paragraph?.rich_text);
      if (text) {
        firstParagraph = text;
        continue;
      }
    }
    remaining.push(block);
  }

  return { firstParagraph, remaining };
}

function extractCtaFromBlocks(
  blocks: NotionBlock[]
): { cta: CTA | null; remaining: NotionBlock[] } {
  let cta: CTA | null = null;
  const remaining: NotionBlock[] = [];

  for (const block of blocks) {
    if (!cta && block.type === "button") {
      const btn = (block as NotionButtonBlock).button;
      const href = btn?.url?.trim();
      const label = btn?.label?.trim();
      if (href && label) {
        cta = { href, label };
        continue;
      }
    }

    if (!cta && block.type === "paragraph") {
      const paragraph = (block as { paragraph?: { rich_text?: { href?: string; plain_text?: string }[] } }).paragraph;
      const rich = paragraph?.rich_text ?? [];
      const link = rich.find((r) => !!r.href);
      const href = link?.href?.trim();
      if (href) {
        const label = (link?.plain_text ?? richTextToPlain(rich)) || "Découvrir";
        cta = { href, label };
        continue;
      }
    }

    remaining.push(block);
  }

  return { cta, remaining };
}

export function HeroSplitSection({
  title,
  lead,
  eyebrow,
  blocks,
  baseSlug,
}: MarketingSectionProps) {
  const { content, media } = splitContentAndMedia(blocks);
  const { cta, remaining } = extractCtaFromBlocks(content);
  const { first: h1Text, second: h2Text, remaining: afterHeadings } =
    extractFirstHeadings(remaining);
  const { firstParagraph, remaining: tailBlocks } =
    extractFirstParagraph(afterHeadings);
  const textBlocks = tailBlocks.filter(
    (block) => !HEADING_TYPES.has(block.type as NotionBlock["type"])
  );
  const showMedia = media.length > 0;

  const effectiveTitle = title || h1Text || null;
  const effectiveSubtitle = h2Text || (title && h1Text ? h1Text : null);

  return (
    <section className="relative overflow-hidden bg-bg">
      <HeroFloatingLinesBackground />

      <div
        className="
        relative z-10
        w-full max-w-[1120px] mx-auto
        flex flex-col lg:flex-row
        items-center
        gap-8 lg:gap-12
        px-6 lg:px-10
        pt-14 pb-16
        lg:pt-18 lg:pb-14
        min-h-[52vh] lg:min-h-[60vh]
      "
      >
        {/* TEXTE */}
        <div className="flex-1 max-w-lg lg:max-w-xl text-left space-y-4 lg:space-y-5">
          <div className="marketing-heading hero-heading">
            {eyebrow ? (
              <div className="marketing-heading__eyebrow">
                <span className="marketing-eyebrow-pill">{eyebrow}</span>
                <span className="marketing-heading__dash" aria-hidden />
              </div>
            ) : null}

            {effectiveTitle && (
              <h1 className="font-display font-extrabold text-[clamp(2rem,3vw,2.4rem)] leading-tight">
                {effectiveTitle}
              </h1>
            )}

            {effectiveSubtitle && (
              <p className="font-display text-[clamp(1.1rem,2vw,1.4rem)] font-semibold text-fg/90">
                {effectiveSubtitle}
              </p>
            )}

            {lead && (
              <p className="text-[0.98rem] sm:text-[1.05rem] text-fg/80 leading-relaxed max-w-xl">
                {lead}
              </p>
            )}

            {firstParagraph && (
              <p className="text-[0.9rem] sm:text-[0.95rem] text-fg/80 leading-relaxed max-w-xl">
                {firstParagraph}
              </p>
            )}
          </div>

          {textBlocks.length > 0 && (
            <div className="prose prose-notion max-w-2xl">
              <Blocks blocks={textBlocks} currentSlug={baseSlug} />
            </div>
          )}

          {cta && (
            <a
              href={cta.href}
              className="
                inline-flex w-auto max-w-max self-start items-center justify-center
                rounded-full
                px-6 py-3
                text-[0.9rem] sm:text-[1rem]
                font-semibold tracking-tight
                text-[color:var(--primary-contrast,#1a1a1a)]
                bg-[radial-gradient(circle_at_20%_-20%,rgba(255,255,255,0.25),transparent_55%),color-mix(in_oklab,var(--primary)_85%,#fff)]
                shadow-[0_20px_40px_rgba(15,11,40,0.25)]
                hover:shadow-[0_24px_46px_rgba(15,11,40,0.28)]
                transition-transform duration-150
                hover:-translate-y-0.5
              "
            >
              {cta.label}
            </a>
          )}
        </div>

        {/* MEDIA */}
        {showMedia && (
          <div className="w-full max-w-lg lg:max-w-md flex justify-center">
            <div className="rounded-3xl overflow-hidden shadow-none bg-transparent">
              <Blocks blocks={media} currentSlug={baseSlug} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
