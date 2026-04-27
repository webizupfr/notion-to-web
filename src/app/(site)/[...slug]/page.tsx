import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { unstable_cache } from "next/cache";

import { Blocks } from "@/components/notion/Blocks";
import { PageSection } from "@/components/layout/PageSection";
import { getPageBundle } from "@/lib/content-store";
import type { NotionBlock } from "@/lib/notion";

/**
 * Catch-all des pages statiques rendues depuis Notion (`NOTION_PAGES_DB`).
 *
 * Cas d'usage : pages légales, à propos, manifeste, CGV, etc.
 *
 * Pipeline :
 *   - Notion DB (Pages) → sync KV → bundle ici → <Blocks/> render.
 *
 * Sécurité : si `visibility === 'private'`, on requiert le password Notion
 * via cookie ou `?key=...`. Sinon on redirige sur `/gate`.
 *
 * Routes plus sophistiquées (programs, blog, admin, my-learning…) ont leurs
 * propres fichiers — ce catch-all reste volontairement minimaliste.
 */

export const revalidate = 0;

type Params = { slug: string[] };
type SearchParams = Record<string, string>;

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<Params> | Params;
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const resolvedParams = await (params as Promise<Params>);
  const slugSegments = Array.isArray(resolvedParams.slug)
    ? resolvedParams.slug
    : [resolvedParams.slug];
  const slug = slugSegments.join("/");

  // 1. Lookup KV
  const bundle = await unstable_cache(
    async () => getPageBundle(slug),
    [`page-bundle:${slug}`],
    { tags: [`page:${slug}`], revalidate: 60 },
  )();

  if (!bundle) return notFound();

  const { meta, blocks } = bundle;

  // 2. Gate si page privée
  if (meta.visibility === "private") {
    const sp =
      (await (searchParams as Promise<SearchParams>).catch(() => undefined)) ||
      (searchParams as SearchParams | undefined);
    const cookieStore = await cookies();
    const cookieKey = cookieStore.get("gate_key")?.value;
    const rawKey = (sp?.key ?? sp?.token ?? cookieKey ?? "") as string;
    const key = rawKey.trim();
    const expected = (meta.password ?? "").trim();

    if (!key) redirect(`/gate?next=/${slug}`);
    if (expected && key !== expected) redirect(`/gate?next=/${slug}&e=1`);
  }

  // 3. Pas de blocs → 404 (page vide considérée comme inexistante)
  if (!blocks?.length) return notFound();

  return (
    <article className="flex w-full flex-col gap-[var(--space-lg)]">
      <PageSection variant="content" size="balanced">
        <header className="mb-[var(--space-lg)]">
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.6rem)] leading-[1.05] tracking-[-0.03em] font-bold text-[color:var(--text-primary)]">
            {meta.title}
          </h1>
          {meta.description ? (
            <p className="mt-[var(--space-sm)] max-w-[60ch] text-[1.05rem] leading-[1.55] text-[color:var(--text-secondary)]">
              {meta.description}
            </p>
          ) : null}
        </header>

        <div className="notion-render w-full">
          <Blocks blocks={blocks as NotionBlock[]} currentSlug={slug} />
        </div>
      </PageSection>
    </article>
  );
}
