import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";

import { PageSection } from "@/components/layout/PageSection";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { getWorkshopBundle } from "@/lib/content-store";

export const revalidate = 0;

export default async function WorkshopPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams?: Promise<Record<string, string>> | Record<string, string>;
}) {
  const { slug } = await (params as Promise<{ slug: string }>);

  const bundle = await unstable_cache(
    async () => await getWorkshopBundle(slug),
    ["workshop-bundle:" + slug],
    { tags: ["page:workshop:" + slug], revalidate: 60 }
  )();

  if (!bundle) return notFound();

  if (bundle.visibility === "private") {
    const sp =
      (await (searchParams as Promise<Record<string, string>>).catch(() => undefined)) ||
      (searchParams as Record<string, string> | undefined);
    const cookieStore: Awaited<ReturnType<typeof cookies>> = await cookies();
    const cookieKey = cookieStore.get("gate_key")?.value;
    const rawKey = ((sp?.key ?? sp?.token) as string | undefined) || cookieKey;
    const key = rawKey?.trim() ?? "";
    const password = bundle.password?.trim() ?? "";
    if (!key) redirect(`/gate?next=/atelier/${slug}`);
    if (password && key !== password) redirect(`/gate?next=/atelier/${slug}&e=1`);
  }

  const layout = bundle.settings?.layout ?? "list";

  return (
    <>
      <PageSection variant="content">
        <div className="space-y-[var(--space-s)]">
          <div className="flex flex-wrap items-center justify-between gap-[var(--space-s)]">
            <div className="space-y-[var(--space-xs)]">
              <span className="pill">Atelier</span>
              <Heading level={1}>{bundle.title}</Heading>
            </div>
            <Link href={`/${bundle.derivedHub.slug}`} className="pill inline-flex items-center gap-[var(--space-xs)]">
              Issu de {bundle.derivedHub.title}
            </Link>
          </div>
          {bundle.description ? <Text variant="muted">{bundle.description}</Text> : null}
        </div>
      </PageSection>

      <PageSection variant="content">
        <div className="space-y-[var(--space-m)]">
          <div
            className={
              layout === "grid"
                ? "grid gap-[var(--space-m)] md:grid-cols-2"
                : "flex flex-col gap-[var(--space-s)]"
            }
          >
            {bundle.days.map((day) => (
              <article key={day.id} className="surface-card space-y-[var(--space-xs)]">
                <div className="flex items-center justify-between gap-[var(--space-s)]">
                  <Heading level={2}>{day.title || `Jour ${day.order}`}</Heading>
                  <Text variant="small" className="uppercase tracking-[0.12em] text-[color:var(--fg-muted)]">
                    Jour {day.order}
                  </Text>
                </div>
                {day.summary ? <Text variant="small" className="text-[color:var(--fg-muted)]">{day.summary}</Text> : null}
                <div className="flex flex-wrap items-center gap-[var(--space-s)] pt-[var(--space-xs)]">
                  <Link href={`/${day.slug}`} className="btn btn-primary text-sm">
                    Ouvrir la journée
                  </Link>
                  <Text variant="small" className="uppercase tracking-[0.12em] text-[color:var(--fg-muted)]">
                    {bundle.derivedHub.title}
                  </Text>
                </div>
              </article>
            ))}
          </div>

          {bundle.days.length === 0 ? (
            <div className="surface-panel text-center">
              <Text variant="small" className="text-[color:var(--fg-muted)]">
                Aucun jour sélectionné pour cet atelier.
              </Text>
            </div>
          ) : null}
        </div>
      </PageSection>
    </>
  );
}
