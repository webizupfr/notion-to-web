import Link from "next/link";

import { MarketingHero } from "@/components/layout/MarketingHero";
import { Text } from "@/components/ui/Text";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden font-sans">
      {/* Fond animé (conserve les blobs / noise / vignette globaux) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-blob blob-amber" />
        <div className="bg-blob blob-rose" />
        <div className="noise" />
        <div className="vignette" />
      </div>

      <main className="relative flex min-h-screen flex-col justify-center">
        <MarketingHero
          kicker="Studio d’innovation"
          eyebrow="Impulsion"
          title="Le studio d’innovation augmentée."
          subtitle="Un studio d’action où l’on apprend en construisant, et où chaque défi devient un moteur d’innovation."
        >
          <div className="flex flex-col gap-[var(--space-xs)]">
            <Link href="/studio" className="btn btn-primary">
              Le Studio (équipes & campus)
            </Link>
            <Text variant="small" className="text-[color:var(--muted)]">
              Propulser vos équipes
            </Text>
          </div>
          <div className="flex flex-col gap-[var(--space-xs)]">
            <Link href="/lab" className="btn btn-secondary">
              Le Lab (entrepreneurs)
            </Link>
            <Text variant="small" className="text-[color:var(--muted)]">
              IA, autonomie, apprentissage
            </Text>
          </div>
          <Link href="/gate?next=/" className="btn btn-accent" title="Accès aux espaces protégés">
            Accès protégé
          </Link>
        </MarketingHero>
      </main>
    </div>
  );
}
