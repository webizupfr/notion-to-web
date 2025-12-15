import Link from "next/link";

import { Heading } from "@/components/ui/Heading";
import { PageSection } from "@/components/layout/PageSection";
import { Text } from "@/components/ui/Text";

function Content({ next, error }: { next: string; error?: string | null }) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-blob blob-amber" />
        <div className="bg-blob blob-rose" />
        <div className="noise" />
        <div className="vignette" />
      </div>

      <main className="relative z-10 flex min-h-dvh items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-sm">
          <PageSection variant="marketing">
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border)] text-[color:var(--primary)]">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
                </svg>
              </div>
              <Heading level={2}>Espace protégé</Heading>
              <Text variant="muted">
                Saisissez la <strong>clé d’accès</strong> partagée pour déverrouiller le contenu.
              </Text>

              {error ? (
                <Text
                  variant="small"
                  className="rounded-[var(--r-l)] border border-[color:var(--danger)]/35 bg-[color-mix(in_srgb,var(--danger)_12%,var(--bg-card)_88%)] px-[var(--space-m)] py-[var(--space-s)] text-[color:var(--danger)]"
                >
                  Clé invalide. Réessayez ou contactez votre interlocuteur.
                </Text>
              ) : null}

              <GateForm next={next} />

              <Text variant="small" className="text-[color:var(--muted)]">
                Besoin d’aide ?{" "}
                <Link href="/contact" className="underline underline-offset-2 hover:opacity-80">
                  Contact
                </Link>{" "}
                ·{" "}
                <a href="mailto:hello@impulsion.studio" className="underline underline-offset-2 hover:opacity-80">
                  hello@impulsion.studio
                </a>
              </Text>
            </div>
          </PageSection>
        </div>
      </main>
    </div>
  );
}

import { GateForm } from "./GateForm";

// Server page (no suspense, stable SSR)
export default function Gate({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const nextRaw = (searchParams?.next as string | undefined) || "/";
  const error = (searchParams?.e as string | undefined) || null;
  return <Content next={nextRaw} error={error} />;
}
