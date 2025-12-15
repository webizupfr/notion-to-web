import { Blocks } from "@/components/notion/Blocks";
import { SectionHeader } from "./SectionHeader";
import type { MarketingSectionProps } from "./types";

export function LogosBandSection({
  title,
  lead,
  eyebrow,
  blocks,
  baseSlug,
}: MarketingSectionProps) {
  const showHeader = Boolean(title || lead || eyebrow);

  return (
    <section data-preset="logos-band" className="w-full bg-transparent">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10">
        {showHeader ? (
          <div className="mx-auto mb-6 max-w-4xl text-center sm:mb-10">
            <SectionHeader title={title} lead={lead} eyebrow={eyebrow} />
          </div>
        ) : null}

        <div className="relative isolate py-8 sm:py-10 lg:py-12">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-border/70"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-border/70"
          />

          <div
            className="logos-band__grid
              [&_.notion-columns]:gap-8 [&_.notion-columns]:justify-items-center
              [&_.notion-column]:items-center [&_.notion-column]:gap-4
              [&_figure]:m-0 [&_figure]:w-auto [&_figure]:max-w-[11rem]
              [&_figure]:flex [&_figure]:flex-col [&_figure]:items-center [&_figure]:justify-center [&_figure]:space-y-0
              [&_figure]:transition-transform [&_figure]:duration-200 [&_figure]:ease-out
              [&_figure:hover]:-translate-y-1 [&_figure:hover]:scale-[1.02]
              [&_.notion-media__inner]:p-0 [&_.notion-media__inner]:shadow-none [&_.notion-media__inner]:bg-transparent
              [&_img]:max-h-10 sm:[&_img]:max-h-12 lg:[&_img]:max-h-14 [&_img]:w-auto [&_img]:object-contain
              [&_img]:opacity-70 [&_img]:grayscale [&_img]:transition [&_img]:duration-200 [&_img]:ease-out
              [&_figure:hover_img]:opacity-100 [&_figure:hover_img]:grayscale-0"
          >
            <Blocks blocks={blocks} currentSlug={baseSlug} />
          </div>
        </div>
      </div>
    </section>
  );
}
