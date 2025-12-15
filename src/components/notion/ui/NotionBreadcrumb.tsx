import type { ReactNode } from "react";
import { Text } from "@/components/ui/Text";

export type BreadcrumbItem = { title: string; href?: string | null };

export function NotionBreadcrumb({ items }: { items: BreadcrumbItem[] }): ReactNode {
  if (!items.length) return null;
  return (
    <nav aria-label="Fil d'ariane" className="flex flex-wrap items-center gap-2 text-sm">
      {items.map((item, idx) => (
        <div key={`${item.title}-${idx}`} className="flex items-center gap-2">
          {item.href ? (
            <a
              href={item.href}
              className="rounded-[var(--r-s)] bg-[color:var(--bg-soft)] px-2 py-1 text-[color:var(--fg)] transition hover:bg-[color-mix(in_srgb,var(--bg-soft)_85%,white_15%)]"
            >
              {item.title}
            </a>
          ) : (
            <Text variant="small" className="text-[var(--muted)]">
              {item.title}
            </Text>
          )}
          {idx < items.length - 1 ? <span className="text-[var(--muted)]">›</span> : null}
        </div>
      ))}
    </nav>
  );
}
