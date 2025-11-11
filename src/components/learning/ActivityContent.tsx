import "server-only";

import { Blocks } from "@/components/notion/Blocks";
import { renderWidget } from "@/components/widgets/renderWidget";
import { pageBlocksDeepCached, type NotionBlock } from "@/lib/notion";
import { parseWidget } from "@/lib/widget-parser";

type ActivityContentProps = {
  activityId: string;
  baseSlug: string;
  className?: string;
  fallbackWidgetYaml?: string | null;
};

export async function ActivityContent({
  activityId,
  baseSlug,
  className,
  fallbackWidgetYaml,
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

  return (
    <div className={`rounded-2xl border bg-white/70 backdrop-blur p-4 sm:p-6 ${className ?? ""}`}>
      <div className={fallbackWidget ? "space-y-6" : undefined}>
        {fallbackWidget}
        {hasBlocks ? <Blocks blocks={blocks} currentSlug={baseSlug} /> : null}
      </div>
    </div>
  );
}
