import { unstable_cache } from "next/cache";

import { MarketingHero } from "@/components/layout/MarketingHero";
import { LearningHubCard } from "@/components/learning";
import { Heading } from "@/components/ui/Heading";
import { PageSection } from "@/components/layout/PageSection";
import { Text } from "@/components/ui/Text";
import { getSprintsIndex } from "@/lib/content-store";

export const revalidate = 0;

export default async function SprintIndexPage() {
  const index = await unstable_cache(
    async () => await getSprintsIndex(),
    ["sprint-index"],
    { tags: ["page:sprint:index"], revalidate: 120 }
  )();

  // Afficher tous les sprints; marquer les privés par un badge 🔒
  const items = (index?.items ?? []);

  if (!index || items.length === 0) {
    return (
      <>
        <MarketingHero
          eyebrow="Sprints pédagogiques"
          title="Sprints & Bootcamps"
          subtitle="Des espaces pédagogiques conçus pour accompagner vos séminaires, hackathons et semaines intensives."
        />
        <PageSection variant="content">
          <Text variant="muted">Aucun sprint n’est disponible pour le moment.</Text>
        </PageSection>
      </>
    );
  }

  return (
    <>
      <MarketingHero
        eyebrow="Sprints pédagogiques"
        title="Sprints & Bootcamps"
        subtitle="Des espaces pédagogiques conçus pour accompagner vos séminaires, hackathons et semaines intensives."
      />
      <PageSection variant="content">
        <div className="space-y-[var(--space-m)]">
          <Heading level={2}>Sprints disponibles</Heading>
          <div className="grid gap-[var(--space-l)] sm:grid-cols-2">
            {items.map((item) => {
              const meta = [
                { label: "Format", value: item.visibility === "private" ? "Privé" : "Ouvert" },
                { label: "Fuseau", value: item.timezone },
              ];
              return (
                <LearningHubCard
                  key={item.slug}
                  mode="sprint"
                  title={item.title}
                  href={`/sprint/${item.slug}`}
                  meta={meta}
                />
              );
            })}
          </div>
        </div>
      </PageSection>
    </>
  );
}
