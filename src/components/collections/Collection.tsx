import Link from "next/link";
import Image from "next/image";

import { fetchDatabaseBundle, type DbItem } from "@/lib/db-render";
import { getDbBundleFromCache } from "@/lib/content-store";
import { mapImageUrl } from "@/lib/notion-image";

export type CollectionProps = {
  databaseId: string;
  basePath?: string;
  pageSize?: number;
  cursor?: string;
  forceView?: "list" | "gallery";
  title?: string;
};

export async function Collection({
  databaseId,
  basePath = "",
  pageSize = 24,
  cursor,
  forceView,
}: CollectionProps) {
  try {
    const cursorKey = cursor ?? '_';
    const cached = await getDbBundleFromCache(databaseId, cursorKey);
    const bundle = cached?.bundle ?? (await fetchDatabaseBundle(databaseId, { pageSize, startCursor: cursor }));
    const view = forceView ?? bundle.view;

    return (
      <section className="collection space-y-5">
        {/* Titre masqué par défaut - peut être réactivé si besoin */}
        {bundle.hasMore && bundle.nextCursor && (
          <div className="flex justify-end">
            <Link
              href={`?cursor=${encodeURIComponent(bundle.nextCursor)}`}
              className="collection-more link-more text-sm underline underline-offset-4"
            >
              Voir plus
            </Link>
          </div>
        )}

        {view === "gallery" ? (
          <GalleryView items={bundle.items} basePath={basePath} />
        ) : (
          <ListView items={bundle.items} basePath={basePath} />
        )}
      </section>
    );
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if ((err?.code ?? "") === "NO_ACCESS_DB" || String(err?.message ?? "").startsWith("NO_ACCESS_DB:")) {
      return <CollectionNoAccess id={databaseId} />;
    }
    throw error;
  }
}

export function CollectionNoAccess({ id }: { id: string }) {
  const prettyId = id.replace(/-/g, "");
  const notionUrl = `https://www.notion.so/${prettyId}`;

  return (
    <div className="collection-warning my-4 space-y-3 rounded-2xl border p-4 text-sm" data-variant="warning">
      <div className="text-base font-semibold">Cette base n’est pas accessible à l’intégration.</div>
      <ol className="ml-4 list-decimal space-y-1 opacity-90">
        <li>
          Ouvrez la base source dans Notion :
          <a
            href={notionUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-1 link-more underline underline-offset-4"
          >
            {prettyId}
          </a>
        </li>
        <li>Menu <span className="font-semibold">Share</span> → ajoutez votre intégration API.</li>
        <li>Rechargez la page pour voir la collection ici.</li>
      </ol>
      <div className="text-xs opacity-60">Database ID : {id}</div>
    </div>
  );
}

function asHref(item: DbItem, basePath: string): string {
  if (item.slug) {
    const normalizedBase = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
    return `${normalizedBase}/${item.slug}`;
  }
  return item.url ?? "#";
}

export function Tags({ tags }: { tags?: string[] }) {
  if (!tags?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span key={tag} className="tag inline-flex rounded-full px-3 py-1 text-xs font-medium">
          {tag}
        </span>
      ))}
    </div>
  );
}

export function ListView({ items, basePath }: { items: DbItem[]; basePath: string }) {
  return (
    <ul className="collection-list flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={asHref(item, basePath)}
            className="group flex items-center justify-between gap-4 rounded-xl border px-5 py-3.5 transition hover:bg-[var(--background-soft)]"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {item.cover ? (
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-[var(--background-soft)]">
                  <Image
                    src={mapImageUrl(item.cover)}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <h4 className="item-title text-[0.95rem] font-medium leading-[1.4] truncate">
                {item.title}
              </h4>
            </div>
            <span className="flex-shrink-0 text-[0.85rem] text-[var(--muted-soft)] opacity-70 group-hover:opacity-100 transition">
              En savoir plus →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function GalleryView({ items, basePath }: { items: DbItem[]; basePath: string }) {
  return (
    <div className="collection-grid grid gap-5 sm:grid-cols-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={asHref(item, basePath)}
          className="collection-card group flex h-full flex-col overflow-hidden rounded-[20px] border bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="relative h-48 w-full overflow-hidden bg-[var(--background-soft)]">
            {item.cover ? (
              <Image
                src={mapImageUrl(item.cover)}
                alt=""
                fill
                sizes="(min-width: 1024px) 360px, 50vw"
                className="object-cover transition duration-300 group-hover:scale-[1.03]"
              />
            ) : null}
          </div>
          <div className="space-y-2 px-6 pb-6 pt-5">
            <h4 className="item-title font-semibold text-[1.05rem] leading-[1.4] transition group-hover:underline group-hover:underline-offset-4">
              {item.title}
            </h4>
            {item.excerpt ? (
              <p className="item-excerpt text-[0.95rem] leading-[1.6] text-balance line-clamp-3">{item.excerpt}</p>
            ) : null}
            <Tags tags={item.tags} />
          </div>
        </Link>
      ))}
    </div>
  );
}
