import type { ReactNode } from "react";
import { Text } from "@/components/ui/Text";

export type TocEntry = { id: string; title: string; level: 1 | 2 | 3 };

export function NotionTableOfContents({ entries }: { entries: TocEntry[] }): ReactNode {
  if (!entries.length) return null;
  return (
    <nav
      aria-label="Table of contents"
      className="space-y-2 rounded-[var(--r-m)] border border-[color:var(--border)] bg-[color:var(--bg-soft)] px-[var(--space-m)] py-[var(--space-m)] shadow-[var(--shadow-s)]"
    >
      <Text variant="small" className="font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
        Sommaire
      </Text>
      <ul className="space-y-1">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className={
              entry.level === 1 ? "pl-0" : entry.level === 2 ? "pl-3" : "pl-6"
            }
          >
            <a
              href={`#${entry.id}`}
              className="inline-flex rounded-[var(--r-sm)] px-2 py-1 text-[0.95rem] text-[var(--fg)] transition hover:bg-[color-mix(in_oklab,var(--bg)_80%,#fff)]"
            >
              {entry.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
