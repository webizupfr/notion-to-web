import type { ReactNode } from "react";
import { CodePanel } from "@/components/ui/CodePanel";
import { Text } from "@/components/ui/Text";

export function NotionCode({
  code,
  language,
  caption,
}: {
  code: string;
  language?: string | null;
  caption?: string | null;
}): ReactNode {
  return (
    <figure className="space-y-2 notion-codeblock">
      <div
        className="relative overflow-x-auto rounded-[var(--r-l)] bg-[#111315] p-[var(--space-m)] text-[color:#f5f5f5] shadow-[var(--shadow-m)]"
        data-lang={language ?? undefined}
      >
        {language ? (
          <span className="pointer-events-none absolute right-[var(--space-m)] top-[var(--space-m)] text-[11px] uppercase tracking-[0.14em] text-[color-mix(in_srgb,#f5f5f5_60%,rgba(255,255,255,0.5))]">
            {language}
          </span>
        ) : null}
        <CodePanel code={code} language={language ?? undefined} />
      </div>
      {caption ? (
        <figcaption>
          <Text variant="small" className="text-[var(--muted)]">
            {caption}
          </Text>
        </figcaption>
      ) : null}
    </figure>
  );
}
