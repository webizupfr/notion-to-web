import Link from "next/link";

import { MarketingHero } from "@/components/layout/MarketingHero";
import { Heading } from "@/components/ui/Heading";
import { PageSection } from "@/components/layout/PageSection";
import { Text } from "@/components/ui/Text";
import { brand } from "@/config/brand";
import { homeCards } from "@/config/navigation";

export default function Home() {
  return (
    <div className="space-y-[var(--space-6)]">
      <MarketingHero
        kicker="Innovation augmentée"
        eyebrow={brand.name}
        title="Le studio d’innovation augmentée."
        subtitle="Deux univers complémentaires pour passer de l’idée à l’action — le Studio pour propulser vos équipes, et le Lab pour équiper les entrepreneurs."
      >
        <Link href="/contact" className="btn btn-primary">
          {brand.contactLabel}
        </Link>
        <Link href="/blog" className="btn btn-secondary">
          Journal
        </Link>
      </MarketingHero>

      <PageSection variant="marketing">
        <div className="grid gap-[var(--space-m)] sm:grid-cols-2 lg:grid-cols-3">
          {homeCards.map((card) => (
            <Link key={card.href} href={card.href} className="surface-card">
              <span className="pill">{card.pill}</span>
              <Heading level={3}>{card.title}</Heading>
              <Text variant="muted">{card.description}</Text>
            </Link>
          ))}
        </div>
      </PageSection>
    </div>
  );
}
