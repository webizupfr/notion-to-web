import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { brand } from "@/config/brand";
import { listPrograms } from "@/lib/programs";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { ProgramCardThumb } from "@/components/lms/ProgramCardThumb";
import {
  IconArrowRight,
  IconBriefcase,
  IconCheck,
  IconLightbulb,
  IconLock,
  IconStar,
  IconUsers,
} from "@/components/ui/icons";

/**
 * Landing publique — hero + 4 sections + CTA final.
 *
 * Comportement :
 *   - User connecté → auto-redirect vers /my-learning.
 *   - User non connecté → voit la landing complète.
 *
 * Sections (de haut en bas) :
 *   1. Header minimal sticky
 *   2. Hero : eyebrow + h1 + sous-titre + 2 CTA + preuve sociale
 *   3. Comment ça marche : 3 étapes
 *   4. Programmes phares : top 3 publiés
 *   5. Pour qui c'est fait : 3 cibles + 3 prérequis
 *   6. Témoignages Google
 *   7. CTA final
 *   8. Footer minimal
 */

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect('/my-learning');
  }

  // Top 3 programmes pour la section "phares"
  const featuredPrograms = (await listPrograms({}).catch(() => [])).slice(0, 3);

  return (
    <div className="min-h-dvh bg-[color:var(--surface-0)]">
      <SiteHeader />
      <Hero />
      <HowItWorks />
      {featuredPrograms.length > 0 ? <FeaturedPrograms programs={featuredPrograms} /> : null}
      <ForWho />
      <TestimonialsSection />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

// ─── Header ───

function SiteHeader() {
  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-[color:var(--border-subtle)] bg-[color-mix(in_oklab,var(--surface-0)_88%,transparent)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-[clamp(16px,2vw,28px)] py-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[color:var(--text-primary)]"
          aria-label={brand.name}
        >
          <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-[color:var(--accent)]" />
          <span className="font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-tight">
            {brand.name}
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/programs"
            className="rounded-[var(--r-xs)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-1)] hover:text-[color:var(--text-primary)]"
          >
            Programmes
          </Link>
          <Link
            href="/login"
            className="ml-[var(--space-xs)] btn btn-primary"
            style={{ height: 32, padding: '0 14px', fontSize: 12 }}
          >
            Se connecter
          </Link>
        </nav>
      </div>
    </header>
  );
}

// ─── Hero ───

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Halo subtil en fond */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'radial-gradient(800px 400px at 80% -20%, var(--accent-bg) 0%, transparent 60%)',
        }}
      />
      <div className="mx-auto flex max-w-[1200px] flex-col gap-[var(--space-lg)] px-[clamp(20px,3vw,48px)] py-[clamp(64px,10vw,120px)]">
        <span className="eyebrow-pill">
          <span className="eyebrow-pill__dot" aria-hidden />
          {brand.name} · Apprendre l&apos;IA par la pratique
        </span>

        <h1 className="max-w-[18ch] font-[family-name:var(--font-display)] text-[clamp(2.6rem,6vw,4.2rem)] leading-[1.0] tracking-[-0.04em] font-bold text-[color:var(--text-primary)]">
          Apprends ce qui marche.
          <br />
          <span className="text-[color:var(--text-secondary)]">À ton rythme.</span>
        </h1>

        <p className="max-w-[58ch] text-[clamp(1.05rem,1.4vw,1.25rem)] leading-[1.55] text-[color:var(--text-secondary)]">
          Des parcours concrets pour intégrer l&apos;IA dans ton quotidien pro.
          Pas de théorie superflue, juste des actions et des résultats visibles dès cette semaine.
        </p>

        <div className="mt-[var(--space-sm)] flex flex-wrap items-center gap-[var(--space-sm)]">
          <Link
            href="/programs"
            className="btn btn-primary inline-flex items-center gap-2"
            style={{ height: 52, padding: '0 26px', fontSize: 16 }}
          >
            Découvrir les programmes
            <IconArrowRight size={18} aria-hidden />
          </Link>
          <Link
            href="/login"
            className="btn btn-secondary"
            style={{ height: 52, padding: '0 22px', fontSize: 15 }}
          >
            J&apos;ai déjà un compte
          </Link>
        </div>

        {/* Preuve sociale courte (rappel témoignages plus bas) */}
        <div className="mt-[var(--space-md)] flex flex-wrap items-center gap-2 text-[0.9rem] text-[color:var(--text-secondary)]">
          <span className="inline-flex items-center gap-1" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <IconStar
                key={i}
                size={14}
                className="fill-[color:var(--accent)] text-[color:var(--accent)]"
              />
            ))}
          </span>
          <span className="font-mono text-[12px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
            5/5 · Avis Google
          </span>
        </div>
      </div>
    </section>
  );
}

// ─── How it works ───

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Choisis ton programme',
      body: 'Picore parmi nos parcours par thème : challenges courts, accompagnements longs, ateliers ciblés.',
    },
    {
      n: '02',
      title: 'Avance jour après jour',
      body: 'Chaque unité se débloque à ton rythme, dans ton inbox. Pas de pression, juste de la régularité.',
    },
    {
      n: '03',
      title: 'Reçois ton certificat',
      body: 'À la fin du programme, télécharge ton certificat de complétion. Partage-le, ajoute-le à ton profil.',
    },
  ];
  return (
    <section className="border-t border-[color:var(--border-subtle)] py-[clamp(56px,7vw,96px)]">
      <div className="mx-auto max-w-[1200px] px-[clamp(20px,3vw,48px)]">
        <div className="mb-[var(--space-xl)]">
          <span className="eyebrow-pill">
            <span className="eyebrow-pill__dot" aria-hidden />
            Comment ça marche
          </span>
          <h2 className="mt-3 max-w-[22ch] font-[family-name:var(--font-display)] text-[clamp(1.8rem,3vw,2.4rem)] leading-[1.1] tracking-[-0.025em] font-bold text-[color:var(--text-primary)]">
            Trois étapes pour passer à l&apos;action.
          </h2>
        </div>
        <div className="grid gap-[var(--space-lg)] md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="space-y-[var(--space-xs)]">
              <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-[color:var(--accent-edge)]">
                Étape {s.n}
              </span>
              <h3 className="font-[family-name:var(--font-display)] text-[1.2rem] font-semibold tracking-tight text-[color:var(--text-primary)]">
                {s.title}
              </h3>
              <p className="text-[0.95rem] leading-[1.55] text-[color:var(--text-secondary)]">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Programmes phares ───

import type { ProgramMeta } from "@/lib/types";

function FeaturedPrograms({ programs }: { programs: ProgramMeta[] }) {
  return (
    <section className="border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] py-[clamp(56px,7vw,96px)]">
      <div className="mx-auto max-w-[1200px] px-[clamp(20px,3vw,48px)]">
        <div className="mb-[var(--space-xl)] flex flex-col gap-[var(--space-sm)] sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="eyebrow-pill">
              <span className="eyebrow-pill__dot" aria-hidden />
              Programmes en cours
            </span>
            <h2 className="mt-3 max-w-[22ch] font-[family-name:var(--font-display)] text-[clamp(1.8rem,3vw,2.4rem)] leading-[1.1] tracking-[-0.025em] font-bold text-[color:var(--text-primary)]">
              Choisis ton point de départ.
            </h2>
          </div>
          <Link
            href="/programs"
            className="font-mono text-[12px] uppercase tracking-[0.1em] text-[color:var(--accent-edge)] hover:underline"
          >
            Voir tous les programmes →
          </Link>
        </div>

        <div className="grid gap-[var(--space-md)] sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => {
            const isPaid = typeof p.price === 'number' && p.price > 0;
            const thumb = p.thumbnailUrl ?? p.coverImageUrl;
            return (
              <Link
                key={p.slug}
                href={`/programs/${p.slug}`}
                className={`group relative flex flex-col overflow-hidden rounded-[var(--r-l)] border bg-[color:var(--surface-0)] transition-all hover:border-[color:var(--border-strong)] hover:shadow-[var(--shadow-m)] ${
                  isPaid
                    ? 'border-[color:var(--accent-edge)]'
                    : 'border-[color:var(--border-subtle)]'
                }`}
              >
                {/* Badges paywall */}
                {isPaid ? (
                  <>
                    <span
                      className="absolute left-3 top-3 z-[1] inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--accent-edge)]"
                      style={{ background: 'var(--accent)' }}
                      aria-hidden
                    >
                      <IconLock size={13} className="text-[color:var(--accent-ink)]" />
                    </span>
                    <span
                      className="absolute right-3 top-3 z-[1] inline-flex items-center gap-1 rounded-full border border-[color:var(--accent-edge)] px-2.5 py-1 font-mono text-[11px] font-semibold tracking-tight text-[color:var(--accent-ink)]"
                      style={{ background: 'var(--accent)' }}
                    >
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: p.currency ?? 'EUR',
                        maximumFractionDigits: (p.price ?? 0) % 1 === 0 ? 0 : 2,
                      }).format(p.price ?? 0)}
                    </span>
                  </>
                ) : null}

                <ProgramCardThumb src={thumb} title={p.title} />
                <div className="flex flex-1 flex-col gap-[var(--space-xs)] p-[var(--space-md)]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
                    {isPaid ? 'Premium' : p.type === 'event' ? 'Événement' : p.type === 'sync' ? 'Sprint' : 'Programme'}
                  </span>
                  <h3 className="font-[family-name:var(--font-display)] text-[1.1rem] font-semibold tracking-tight text-[color:var(--text-primary)]">
                    {p.title}
                  </h3>
                  {p.description ? (
                    <p className="line-clamp-2 text-[0.9rem] text-[color:var(--text-secondary)]">
                      {p.description}
                    </p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Pour qui c'est fait ───

function ForWho() {
  const targets = [
    {
      icon: IconBriefcase,
      title: 'Entrepreneurs, indépendants, freelances',
      body: 'Tu veux gagner du temps sur tes tâches répétitives sans devenir geek.',
    },
    {
      icon: IconUsers,
      title: 'Équipes métiers, PME',
      body: 'Tu veux faire monter ton équipe en compétence sans complexité.',
    },
    {
      icon: IconLightbulb,
      title: "Curieux qui veulent comprendre l'IA par la pratique",
      body: 'Tu as envie de tester, pas juste de lire des articles.',
    },
  ];

  const bullets = [
    'Aucun prérequis technique',
    'Aucun outil complexe à installer',
    "Juste l'envie de tester sur ton quotidien",
  ];

  return (
    <section className="border-t border-[color:var(--border-subtle)] py-[clamp(56px,7vw,96px)]">
      <div className="mx-auto max-w-[1200px] px-[clamp(20px,3vw,48px)]">
        <div className="mb-[var(--space-xl)]">
          <span className="eyebrow-pill">
            <span className="eyebrow-pill__dot" aria-hidden />
            Pour qui c&apos;est fait
          </span>
          <h2 className="mt-3 max-w-[22ch] font-[family-name:var(--font-display)] text-[clamp(1.8rem,3vw,2.4rem)] leading-[1.1] tracking-[-0.025em] font-bold text-[color:var(--text-primary)]">
            Si tu te reconnais ici, tu es au bon endroit.
          </h2>
        </div>

        <div className="grid gap-[var(--space-md)] md:grid-cols-3">
          {targets.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.title}
                className="rounded-[var(--r-l)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-[var(--space-lg)]"
              >
                <span
                  className="mb-[var(--space-sm)] inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--accent-edge)] bg-[color:var(--accent-bg)]"
                  aria-hidden
                >
                  <Icon size={18} className="text-[color:var(--accent-edge)]" />
                </span>
                <h3 className="font-[family-name:var(--font-display)] text-[1.05rem] font-semibold leading-[1.25] tracking-tight text-[color:var(--text-primary)]">
                  {t.title}
                </h3>
                <p className="mt-2 text-[0.92rem] leading-[1.55] text-[color:var(--text-secondary)]">
                  {t.body}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-[var(--space-xl)] rounded-[var(--r-l)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-[var(--space-lg)]">
          <h3 className="mb-[var(--space-sm)] font-mono text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
            Aucune barrière à l&apos;entrée
          </h3>
          <ul className="grid gap-[var(--space-sm)] sm:grid-cols-3">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-[0.95rem] text-[color:var(--text-primary)]">
                <IconCheck size={16} className="mt-0.5 shrink-0 text-[color:var(--signal-success)]" aria-hidden />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ─── CTA final ───

function FinalCta() {
  return (
    <section className="border-t border-[color:var(--border-subtle)] py-[clamp(64px,8vw,112px)]">
      <div className="mx-auto max-w-[800px] px-[clamp(20px,3vw,48px)] text-center">
        <h2 className="mx-auto max-w-[18ch] font-[family-name:var(--font-display)] text-[clamp(2rem,3.5vw,2.8rem)] leading-[1.05] tracking-[-0.03em] font-bold text-[color:var(--text-primary)]">
          Prêt·e à passer à l&apos;action ?
        </h2>
        <p className="mx-auto mt-[var(--space-md)] max-w-[52ch] text-[1.05rem] leading-[1.55] text-[color:var(--text-secondary)]">
          Démarre avec un programme gratuit aujourd&apos;hui. Si ça te parle, tu pourras
          aller plus loin avec les programmes premium.
        </p>
        <div className="mt-[var(--space-lg)] flex flex-wrap items-center justify-center gap-[var(--space-sm)]">
          <Link
            href="/programs"
            className="btn btn-primary inline-flex items-center gap-2"
            style={{ height: 52, padding: '0 26px', fontSize: 16 }}
          >
            Découvrir les programmes
            <IconArrowRight size={18} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───

function SiteFooter() {
  return (
    <footer className="border-t border-[color:var(--border-subtle)] py-[var(--space-xl)]">
      <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-[var(--space-sm)] px-[clamp(20px,3vw,48px)] sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-[color:var(--accent)]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
            © {new Date().getFullYear()} {brand.name}
          </span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-[var(--space-md)] gap-y-1">
          <Link href="/programs" className="font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]">
            Programmes
          </Link>
          <Link href="/about" className="font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]">
            À propos
          </Link>
          <Link href="/mentions-legales" className="font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]">
            Mentions légales
          </Link>
          <Link href="/cgv" className="font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]">
            CGV
          </Link>
          <Link href="/login" className="font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]">
            Se connecter
          </Link>
        </nav>
      </div>
    </footer>
  );
}
