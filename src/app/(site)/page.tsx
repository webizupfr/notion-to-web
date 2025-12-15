import Link from "next/link";

import { MarketingHero } from "@/components/layout/MarketingHero";
import { Heading } from "@/components/ui/Heading";
import { PageSection } from "@/components/layout/PageSection";
import { Text } from "@/components/ui/Text";

export default function Home() {
  return (
    <div className="space-y-[var(--space-6)]">
      <MarketingHero
        kicker="Innovation augmentée"
        eyebrow="Impulsion"
        title="Le studio d’innovation augmentée."
        subtitle="Deux univers complémentaires pour passer de l’idée à l’action — le Studio pour propulser vos équipes, et le Lab pour équiper les entrepreneurs."
      >
        <Link href="/contact" className="btn btn-primary">
          Planifier un échange
        </Link>
        <Link href="/blog" className="btn btn-secondary">
          Journal
        </Link>
      </MarketingHero>

      <PageSection variant="marketing">
        <div className="grid gap-[var(--space-m)] sm:grid-cols-2">
          <Link href="/studio" className="surface-card">
            <span className="pill">Le Studio</span>
            <Heading level={3}>Collectif, innovation, transformation</Heading>
            <Text variant="muted">Propulser les équipes et les projets stratégiques.</Text>
          </Link>

          <Link href="/lab" className="surface-card">
            <span className="pill">Le Lab</span>
            <Heading level={3}>IA, autonomie, apprentissage</Heading>
            <Text variant="muted">Accompagner les entrepreneurs et intrapreneurs.</Text>
          </Link>
        </div>
      </PageSection>
    </div>
  );
}
