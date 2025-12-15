import type { ReactNode } from "react";
import { Text } from "@/components/ui/Text";

type Props = {
  children: ReactNode;
  caption?: string | null;
  padding?: "xs" | "m";
};

export function NotionMediaFrame({ children, caption, padding = "xs" }: Props) {
  const padClass = padding === "m" ? "p-[var(--space-m)]" : "p-[var(--space-xs)]";
  return (
    <figure className="w-full space-y-[var(--space-s)]">
      <div className={`notion-media__inner ${padClass}`}>
        {children}
      </div>
      {caption ? (
        <figcaption className="px-[var(--space-m)] pb-[var(--space-m)] pt-0">
          <Text variant="small" className="text-[color:var(--muted)]">
            {caption}
          </Text>
        </figcaption>
      ) : null}
    </figure>
  );
}
