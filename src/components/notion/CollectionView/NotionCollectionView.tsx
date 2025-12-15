import { unstable_cache } from "next/cache";

import {
  CollectionNoAccess,
  GalleryView as BaseGalleryView,
  ListView as BaseListView,
  RecordView as BaseRecordView,
} from "@/components/collections/Collection";
import { getDbBundleFromCache, type DbCacheEntry } from "@/lib/content-store";
import { fetchDatabaseBundle, type DbItem } from "@/lib/db-render";

export type NotionCollectionViewProps = {
  databaseId: string;
  viewId?: string | null;
  title?: string | null;
  basePath?: string;
  forceView?: "list" | "gallery" | "table";
};

const DEFAULT_REVALIDATE_SECONDS = 60;

function normalizeViewId(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^[0-9a-fA-F]{32}$/.test(trimmed)) {
    return trimmed.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5").toLowerCase();
  }
  return trimmed;
}

async function loadCachedBundle(databaseId: string, viewKey: string): Promise<DbCacheEntry | null> {
  return await unstable_cache(
    async () => await getDbBundleFromCache(databaseId, viewKey),
    ["notion-collection", databaseId, viewKey],
    { tags: [`db:${databaseId}`], revalidate: DEFAULT_REVALIDATE_SECONDS }
  )();
}

export async function NotionCollectionView({
  databaseId,
  viewId,
  basePath = "",
  forceView,
}: NotionCollectionViewProps) {
  const normalizedViewId = normalizeViewId(viewId);
  const viewKey = normalizedViewId ?? "_";

  let entry = await loadCachedBundle(databaseId, viewKey);

  if (!entry?.bundle && viewKey !== "_") {
    entry = await loadCachedBundle(databaseId, "_");
  }

  let bundle = entry?.bundle ?? null;

  if (!bundle) {
    try {
      bundle = await fetchDatabaseBundle(databaseId, { viewId: normalizedViewId });
    } catch (error) {
      const err = error as { code?: string; message?: string };
      const message = String(err?.message ?? "");
      if ((err?.code ?? "") === "NO_ACCESS_DB" || message.startsWith("NO_ACCESS_DB:")) {
        console.warn("[collection] Database not accessible", { databaseId, viewId: normalizedViewId });
        return <CollectionNoAccess id={databaseId} />;
      }
      throw error;
    }
  }

  const viewMode = forceView ?? bundle.view ?? "list";

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
      ) : viewMode === "table" ? (
        <NotionCollectionRecord items={bundle.items} basePath={basePath} />
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

export function NotionCollectionRecord({
  items,
  basePath,
}: {
  items: DbItem[];
  basePath: string;
}) {
  return <BaseRecordView items={items} basePath={basePath} />;
}
