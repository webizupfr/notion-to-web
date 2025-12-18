import { Blocks } from "@/components/notion/Blocks";
import { SectionHeader } from "./SectionHeader";
import type { MarketingSectionProps } from "./types";

export function StatsBandSection({ title, lead, eyebrow, blocks, baseSlug }: MarketingSectionProps) {
  return (
    <div className="marketing-section__container">
      <section className="relative grid gap-10 rounded-3xl border border-[color:var(--border)] bg-[color:var(--bg-card)] p-12 shadow-lg">
        <div className="absolute inset-x-10 bottom-[-15%] h-1/2 pointer-events-none rounded-full bg-gradient-to-b from-[color-mix(in_srgb,var(--primary-soft)_30%,transparent)] to-transparent opacity-60" />
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <SectionHeader title={title} lead={lead} eyebrow={eyebrow} />
        </div>
        {blocks.length ? (
          <div className="relative z-10 grid gap-8 md:grid-cols-3">
            {blocks.map((block) => (
              <div key={block.id} className="relative rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-card)] p-6 shadow-md">
                <Blocks blocks={[block]} currentSlug={baseSlug} />
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
