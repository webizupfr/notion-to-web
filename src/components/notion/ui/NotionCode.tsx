import type { ReactNode } from "react";
import { CodePanel } from "@/components/ui/CodePanel";
import { Text } from "@/components/ui/Text";
import { CopyCodeButton } from "./CopyCodeButton";

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
    <figure className="my-[var(--space-lg)] space-y-2">
      <div
        className="relative overflow-hidden rounded-[var(--r-l)] border border-white/10 bg-[#0F1115] shadow-[var(--shadow-m)]"
        data-lang={language ?? undefined}
      >
        {/* Bar du haut : badge langage + bouton copier */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#16191F] px-[var(--space-md)] py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">
            {language ?? "code"}
          </span>
          <CopyCodeButton code={code} />
        </div>
        {/* Body code */}
        <div className="overflow-x-auto p-[var(--space-md)] text-[#F5F5F5]">
          <CodePanel code={code} language={language ?? undefined} />
        </div>
      </div>
      {caption ? (
        <figcaption>
          <Text variant="small" className="text-[color:var(--text-tertiary)]">
            {caption}
          </Text>
        </figcaption>
      ) : null}
    </figure>
  );
}
