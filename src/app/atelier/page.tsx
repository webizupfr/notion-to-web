import Link from "next/link";
import { unstable_cache } from "next/cache";

import { PageSection } from "@/components/layout/PageSection";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { getWorkshopsIndex } from "@/lib/content-store";

export const revalidate = 0;

export default async function WorkshopsIndexPage() {
  const index = await unstable_cache(
    async () => await getWorkshopsIndex(),
    ["workshop-index"],
    { tags: ["page:workshop:index"], revalidate: 120 }
  )();

  if (!index || index.items.length === 0) {
    return (
      <PageSection variant="content">
        <div className="space-y-[var(--space-m)]">
          <Heading level={1}>Ateliers</Heading>
          <Text variant="muted">Aucun atelier n’est disponible pour le moment.</Text>
        </div>
      </PageSection>
    );
  }

  return (
    <PageSection variant="content">
      <div className="space-y-[var(--space-l)]">
        <header className="space-y-[var(--space-s)]">
          <span className="pill">Ateliers</span>
          <Heading level={1}>Sélection de workshops</Heading>
          <Text variant="muted">Sélectionnez un atelier dérivé de nos hubs pédagogiques.</Text>
        </header>

        <div className="grid gap-[var(--space-m)] sm:grid-cols-2">
          {index.items.map((item) => (
            <Link
              key={item.slug}
              href={`/atelier/${item.slug}`}
              className="surface-card group"
            >
              <div className="space-y-[var(--space-xs)]">
                {item.visibility === "private" ? (
                  <span className="pill inline-flex items-center gap-[var(--space-xs)]">
                    <span aria-hidden>🔒</span> Privé
                  </span>
                ) : null}
                <Heading level={2} className="group-hover:text-[color:var(--primary)] transition-colors">
                  {item.title}
                </Heading>
                <Text variant="small" className="uppercase tracking-[0.12em] text-[color:var(--fg-muted)]">
                  Hub : {item.hubSlug}
                </Text>
              </div>
              <span className="mt-[var(--space-m)] inline-flex items-center gap-[var(--space-xs)] text-[color:var(--primary)]">
                Découvrir →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </PageSection>
  );
}
