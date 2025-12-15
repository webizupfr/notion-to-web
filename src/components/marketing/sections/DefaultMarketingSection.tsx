import { Blocks } from "@/components/notion/Blocks";
import type { MarketingSectionProps } from "./types";

export function DefaultMarketingSection({ blocks, baseSlug, bodyVariant }: MarketingSectionProps) {
  const variantClass = bodyVariant && bodyVariant !== "default" ? ` marketing-section__body--${bodyVariant}` : "";
  return (
    <div className="marketing-section__container">
      <div className={`marketing-section__body marketing-section__body--default${variantClass}`}>
        <Blocks blocks={blocks} currentSlug={baseSlug} />
      </div>
    </div>
  );
}
