import type { ReactNode } from "react";
import { Text } from "@/components/ui/Text";

export function NotionEquation({
  expression,
  caption,
}: {
  expression: string;
  caption?: string | null;
}): ReactNode {
  return (
    <figure className="space-y-2 rounded-[var(--r-m)] border border-[color:var(--border)] bg-[color:var(--bg-soft)] px-[var(--space-m)] py-[var(--space-s)] text-center shadow-[var(--shadow-s)]">
      <div className="font-mono text-[1.05rem] leading-tight text-[color:var(--fg)]">{expression}</div>
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
