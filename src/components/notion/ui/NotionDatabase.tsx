import type { ReactNode } from "react";
import { NotionCollectionView } from "@/components/notion/CollectionView";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

export function NotionDatabase({
  databaseId,
  viewId,
  title,
  basePath,
  description,
  cards = false,
}: {
  databaseId: string;
  viewId?: string | null;
  title?: string | null;
  description?: string | null;
  basePath?: string;
  cards?: boolean;
}): ReactNode {
  const isGallery = String(viewId ?? "").toLowerCase().includes("gallery") || cards;

  return (
    <section className="space-y-[var(--space-4)]">
      {(title || description) && (
        <div className="space-y-1">
          {title ? <Heading level={3}>{title}</Heading> : null}
          {description ? <Text variant="muted">{description}</Text> : null}
        </div>
      )}
      <div className={isGallery ? "grid gap-[var(--space-m)] sm:grid-cols-2 lg:grid-cols-3" : ""}>
        <NotionCollectionView databaseId={databaseId} viewId={viewId ?? undefined} basePath={basePath} />
      </div>
    </section>
  );
}
