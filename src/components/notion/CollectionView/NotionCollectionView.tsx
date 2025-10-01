import { unstable_cache } from "next/cache";

import {
  CollectionNoAccess,
  GalleryView as BaseGalleryView,
  ListView as BaseListView,
} from "@/components/collections/Collection";
import { getDbBundleFromCache, type DbCacheEntry } from "@/lib/content-store";
import { fetchDatabaseBundle, type DbItem } from "@/lib/db-render";

export type NotionCollectionViewProps = {
  databaseId: string;
  viewId?: string | null;
  title?: string | null;
  basePath?: string;
  forceView?: "list" | "gallery";
};

const DEFAULT_REVALIDATE_SECONDS = 60;

async function loadCachedBundle(databaseId: string, cursor: string): Promise<DbCacheEntry | null> {
  return await unstable_cache(
    async () => await getDbBundleFromCache(databaseId, cursor),
    ["notion-collection", databaseId, cursor],
    { tags: [`db:${databaseId}`], revalidate: DEFAULT_REVALIDATE_SECONDS }
  )();
}

export async function NotionCollectionView({
  databaseId,
  viewId,
  title,
  basePath = "",
  forceView,
}: NotionCollectionViewProps) {
  const cursorKey = viewId && viewId.trim() ? viewId : "_";

  let entry = await loadCachedBundle(databaseId, cursorKey);

  if (!entry?.bundle && cursorKey !== "_") {
    entry = await loadCachedBundle(databaseId, "_");
  }

  let bundle = entry?.bundle ?? null;

  if (!bundle) {
    try {
      bundle = await fetchDatabaseBundle(databaseId);
    } catch (error) {
      const err = error as { code?: string; message?: string };
      const message = String(err?.message ?? "");
      if ((err?.code ?? "") === "NO_ACCESS_DB" || message.startsWith("NO_ACCESS_DB:")) {
        return <CollectionNoAccess id={databaseId} />;
      }
      throw error;
    }
  }

  const viewMode = forceView ?? bundle.view ?? "list";
  const headerTitle = title?.trim() ? title : bundle.name;

  return (
    <section className="collection space-y-5">
      {/* Titre masqué par défaut */}
      {bundle.hasMore && bundle.nextCursor ? (
        <div className="flex justify-end">
          <span className="collection-more text-sm opacity-70">
            <span>Plus d&apos;éléments disponibles</span>
          </span>
        </div>
      ) : null}

      {viewMode === "gallery" ? (
        <NotionCollectionGallery items={bundle.items} basePath={basePath} />
      ) : (
        <NotionCollectionList items={bundle.items} basePath={basePath} />
      )}
    </section>
  );
}

export function NotionCollectionList({
  items,
  basePath,
}: {
  items: DbItem[];
  basePath: string;
}) {
  return <BaseListView items={items} basePath={basePath} />;
}

export function NotionCollectionGallery({
  items,
  basePath,
}: {
  items: DbItem[];
  basePath: string;
}) {
  return <BaseGalleryView items={items} basePath={basePath} />;
}
