import "server-only";

import { Blocks } from "@/components/notion/Blocks";
import { renderWidget } from "@/components/widgets/renderWidget";
import { pageBlocksDeepCached, type NotionBlock } from "@/lib/notion";
import { parseWidget } from "@/lib/widget-parser";
import { PageSection } from "@/components/layout/PageSection";
import { splitBlocksIntoSections } from "@/components/learning/sectioning";

type ActivityContentProps = {
  activityId: string;
  baseSlug: string;
  className?: string;
  fallbackWidgetYaml?: string | null;
  renderMode?: "default" | "day";
  /**
   * When renderMode="day", allow the caller to opt-out of the wrapper PageSection.
   * Useful when embedding inside an existing section/panel.
   */
  wrapInSection?: boolean;
  /**
   * When renderMode="day", allow the caller to disable the surface wrapper
   * to compose their own panel.
   */
  withSurface?: boolean;
};

export async function ActivityContent({
  activityId,
  baseSlug,
  className,
  fallbackWidgetYaml,
  renderMode = "default",
}: ActivityContentProps) {
  let blocks: NotionBlock[] = [] as unknown as NotionBlock[];
  try {
    // Use cached deep fetch to keep it fast and stable
    blocks = (await pageBlocksDeepCached(activityId)) as unknown as NotionBlock[];
  } catch {
    blocks = [] as unknown as NotionBlock[];
  }

  const hasBlocks = blocks.length > 0;
  let inlineWidgetDetected = false;

  if (hasBlocks) {
    inlineWidgetDetected = blocks.some((block) => {
      if (block.type !== "code") return false;
      const rich = block.code?.rich_text ?? [];
      const codeText = rich.map((r) => r.plain_text ?? "").join("\n");
      if (!codeText.trim()) return false;
      return Boolean(parseWidget(codeText));
    });
  }

  let fallbackWidget = null;
  if (!inlineWidgetDetected && fallbackWidgetYaml) {
    const parsed = parseWidget(fallbackWidgetYaml);
    if (parsed) {
      fallbackWidget = renderWidget(parsed, {
        storageKey: `${baseSlug}::${activityId}`,
      });
    }
  }

  if (!hasBlocks && !fallbackWidget) return null;
  if (!hasBlocks && fallbackWidget) return fallbackWidget;

  const baseCardClass =
    renderMode === "day"
      ? "" // en mode "day", on laisse les sections internes gérer les cartes
      : "rounded-2xl border bg-white/70 backdrop-blur";

  if (renderMode === "day") {
    const sections = splitBlocksIntoSections(blocks);
    if (!sections.length) return fallbackWidget;

    return (
      <>
        {sections.map((section, idx) => {
          const tone = idx % 2 === 0 ? "default" : "alt";
          return (
            <PageSection
              key={section.id}
              variant="content"
              tone={tone}
              size="wide"
              innerPadding={true}
              className="py-[var(--space-5)] sm:py-[var(--space-6)]"
            >
              <div className={`content-panel section-band w-full ${className ?? ""}`}>
                {fallbackWidget && idx === 0 ? fallbackWidget : null}
                {section.blocks.length ? (
                  <Blocks blocks={section.blocks} currentSlug={baseSlug} renderMode={renderMode} />
                ) : null}
              </div>
            </PageSection>
          );
        })}
      </>
    );
  }

  const hasPadding = Boolean(fallbackWidget);
  const contentBody = (
    <div className={hasPadding ? "space-y-6" : undefined}>
      {fallbackWidget}
      {hasBlocks ? <Blocks blocks={blocks} currentSlug={baseSlug} renderMode={renderMode} /> : null}
    </div>
  );

  return (
    <div className={`${baseCardClass} p-[var(--space-4)] sm:p-[var(--space-6)] ${className ?? ""}`}>
      {contentBody}
    </div>
  );
}
