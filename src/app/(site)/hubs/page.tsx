import { unstable_cache } from "next/cache";

import { MarketingHero } from "@/components/layout/MarketingHero";
import { LearningHubCard } from "@/components/learning";
import { Heading } from "@/components/ui/Heading";
import { PageSection } from "@/components/layout/PageSection";
import { Text } from "@/components/ui/Text";
import { getHubsIndex } from "@/lib/content-store";

export const revalidate = 0;

async function loadHubsIndex() {
  return await unstable_cache(
    async () => await getHubsIndex(),
    ["hubs-index"],
    { tags: ["hubs:index"], revalidate: 60 }
  )();
}

export default async function HubsIndex() {
  const hubsIndex = await loadHubsIndex();
  const hubs = hubsIndex?.items ?? [];

  return (
    <>
      <MarketingHero
        eyebrow="Hubs pédagogiques"
        title="Impulsion Hubs"
        subtitle="Des parcours individuels pour pratiquer l’IA et l’innovation au quotidien."
        size="wide"
      />

      <PageSection variant="content" size="wide">
        <div className="space-y-[var(--space-m)]">
          <Heading level={2}>Parcours disponibles</Heading>
          {hubs.length ? (
            <div className="grid gap-[var(--space-l)] sm:grid-cols-2">
              {hubs.map((hub) => {
                const meta = [
                  { label: "Format", value: hub.visibility === "private" ? "Privé" : "Ouvert" },
                ];
                return (
                  <LearningHubCard
                    key={hub.slug}
                    mode="hub"
                    title={hub.title}
                    description={hub.description ?? undefined}
                    href={`/hubs/${hub.slug}`}
                    meta={meta}
                  />
                );
              })}
            </div>
          ) : (
            <Text variant="muted">
              Aucun hub pour le moment. Synchronisez vos contenus Notion pour les afficher ici.
            </Text>
          )}
        </div>
      </PageSection>
    </>
  );
}
