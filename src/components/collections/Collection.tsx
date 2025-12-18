import Link from "next/link";
import Image from "next/image";

import { fetchDatabaseBundle, type DbItem, type DbItemCell } from "@/lib/db-render";
import { getDbBundleFromCache } from "@/lib/content-store";
import { mapImageUrl } from "@/lib/notion-image";

export type CollectionProps = {
  databaseId: string;
  basePath?: string;
  pageSize?: number;
  cursor?: string;
  viewId?: string | null;
  forceView?: "list" | "gallery" | "table";
  title?: string;
};

function normalizeViewId(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^[0-9a-fA-F]{32}$/.test(trimmed)) {
    return trimmed.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5").toLowerCase();
  }
  return trimmed;
}

export async function Collection({
  databaseId,
  basePath = "",
  pageSize = 24,
  cursor,
  viewId,
  forceView,
}: CollectionProps) {
  try {
  const normalizedViewId = normalizeViewId(viewId);
  const viewKey = normalizedViewId ?? '_';
  const cursorKey = cursor ?? '_';
  const cached = await getDbBundleFromCache(databaseId, viewKey, cursorKey);
  const bundle =
    cached?.bundle ??
    (await fetchDatabaseBundle(databaseId, {
      pageSize,
      startCursor: cursor,
      viewId: normalizedViewId,
    }));
  const view = forceView ?? bundle.view ?? "list";

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
        ) : view === "table" ? (
          <RecordView items={bundle.items} basePath={basePath} />
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
  const isProd = process.env.NODE_ENV === "production";

  return (
    <div className="collection-warning my-4 space-y-3 rounded-2xl border p-4 text-sm" data-variant="warning">
      <div className="text-base font-semibold">Cette base n’est pas accessible à l’intégration.</div>
      {isProd ? (
        <>
          <p className="opacity-90">
            Ce bloc est masqué pour protéger les liens directs vers vos bases Notion. 
            Contactez l’équipe interne pour corriger les droits d’accès de l’intégration.
          </p>
          <div className="text-xs opacity-60">Database ID : {id}</div>
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

function asHref(item: DbItem, basePath: string): string {
  if (item.slug) {
    const normalizedBase = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
    return `${normalizedBase}/${item.slug}`;
  }
  // Éviter de lier vers Notion en production (risque de fuite de DB publiques).
  if (process.env.NODE_ENV !== "production") {
    return item.url ?? "#";
  }
  return "#";
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
    <ul className="collection-list flex flex-col gap-[var(--space-3)]">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={asHref(item, basePath)}
            className="group flex items-center justify-between gap-4 rounded-[var(--r-lg)] border border-[color:var(--border)] px-[var(--space-5)] py-3.5 transition hover:bg-[color-mix(in_oklab,var(--bg)_94%,#fff)]"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {item.cover ? (
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-[var(--r-sm)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)]">
                  <Image
                    src={mapImageUrl(item.cover)}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <div className="min-w-0 space-y-1">
                <h4 className="item-title font-medium leading-[1.35] text-[var(--step-0)] sm:text-[var(--step-1)] truncate text-[color:var(--fg)]">
                  {item.title}
                </h4>
                {item.excerpt ? (
                  <p className="item-excerpt text-[var(--step-0)] leading-[1.45] text-[color:var(--muted)] line-clamp-2">
                    {item.excerpt}
                  </p>
                ) : null}
              </div>
            </div>
            <span className="flex-shrink-0 text-[0.85rem] text-[color:var(--muted)] opacity-70 group-hover:opacity-100 transition">
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
    <div className="collection-grid grid gap-[var(--space-5)] sm:grid-cols-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={asHref(item, basePath)}
          className="collection-card group flex h-full flex-col overflow-hidden rounded-[var(--r-lg)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_96%,#fff)] transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="relative h-48 w-full overflow-hidden bg-[color-mix(in_oklab,var(--bg)_94%,#fff)]">
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
          <div className="space-y-1.5 px-[var(--space-6)] pb-[var(--space-6)] pt-[var(--space-5)]">
            <h4 className="item-title font-semibold text-[0.95rem] leading-[1.3] transition group-hover:underline group-hover:underline-offset-4 text-[color:var(--fg)]">
              {item.title}
            </h4>
            {item.excerpt ? (
              <p className="item-excerpt text-[0.82rem] leading-[1.35] text-balance line-clamp-3 text-[color:var(--muted)]">
                {item.excerpt}
              </p>
            ) : null}
            <Tags tags={item.tags} />
          </div>
        </Link>
      ))}
    </div>
  );
}

const HIDDEN_KEYS = new Set(["title", "cover", "slug", "excerpt", "tags", "url"]);

function extractColumnKeys(items: DbItem[]): { keys: string[]; labels: Record<string, string> } {
  const seen = new Set<string>();
  const labels: Record<string, string> = {};
  for (const item of items) {
    for (const cell of item.cells ?? []) {
      if (HIDDEN_KEYS.has(cell.key)) continue;
      if (seen.has(cell.key)) continue;
      seen.add(cell.key);
      labels[cell.key] = cell.label ?? cell.key;
    }
  }
  return { keys: Array.from(seen), labels };
}

function renderCellValue(cell: DbItemCell | undefined) {
  if (!cell) return null;
  if (cell.type === "multi_select" && Array.isArray(cell.value)) {
    const tags = cell.value as string[];
    return tags.length ? (
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span key={tag} className="tag inline-flex rounded-full px-2 py-0.5 text-[0.75rem] font-medium">
            {tag}
          </span>
        ))}
      </div>
    ) : null;
  }
  if (cell.type === "url" && cell.text) {
    return (
      <a href={cell.text} target="_blank" rel="noreferrer" className="text-[color:var(--primary)] underline">
        {cell.text}
      </a>
    );
  }
  return cell.text ?? null;
}

export function RecordView({ items, basePath }: { items: DbItem[]; basePath: string }) {
  if (!items.length) return null;
  const { keys, labels } = extractColumnKeys(items);

  return (
    <div className="collection-record overflow-x-auto rounded-[var(--r-xl)] border border-[color:var(--border)] bg-[color:var(--bg-card)] shadow-[var(--shadow-s)]">
      <table className="min-w-[720px] w-full border-collapse">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-[0.85rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
              Titre
            </th>
            {keys.map((key) => (
              <th
                key={key}
                className="px-4 py-3 text-left text-[0.85rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]"
              >
                {labels[key]}
              </th>
            ))}
            <th aria-hidden className="w-16" />
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr
              key={item.id}
              className={idx % 2 === 0 ? "bg-[color-mix(in_oklab,var(--bg)_95%,#fff_5%)]" : ""}
            >
              <td className="px-4 py-4 font-semibold text-[color:var(--fg)]">
                <Link href={asHref(item, basePath)} className="hover:underline">
                  {item.title}
                </Link>
              </td>
              {keys.map((key) => {
                const cell = (item.cells ?? []).find((c) => c.key === key);
                return (
                  <td key={key} className="px-4 py-4 align-top text-[0.95rem] text-[color:var(--muted)]">
                    {renderCellValue(cell)}
                  </td>
                );
              })}
              <td className="px-4 py-4 text-right">
                <Link href={asHref(item, basePath)} className="text-[color:var(--primary)] text-sm font-semibold">
                  Ouvrir →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
