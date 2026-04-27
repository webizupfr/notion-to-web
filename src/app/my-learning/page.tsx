import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listUserEnrollments, getProgramProgress } from '@/lib/db/progress';
import { getProgramTree, listPrograms } from '@/lib/programs';
import { ProgressBar } from '@/components/lms/ProgressBar';
import { ProgramCardThumb } from '@/components/lms/ProgramCardThumb';
import { CompletionToast } from '@/components/lms/CompletionToast';
import { unitLabelsFor } from '@/lib/program-nav';
import type { Enrollment, ProgramType } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Card = {
  title: string;
  slug: string;
  /** Destination du clic : prochaine unit non terminée, sinon overview */
  href: string;
  type: ProgramType;
  cohortSlug: string | null;
  coverImageUrl: string | null;
  thumbnailUrl: string | null;
  completedCount: number;
  totalUnits: number;
  unitLabelPlural: string;
  enrolledAt: Date;
  completedAt: Date | null;
};

async function loadCard(e: Enrollment, userId: string): Promise<Card | null> {
  const tree = await getProgramTree(e.programSlug);
  if (!tree) return null;

  const progress = await getProgramProgress({
    userId,
    programType: e.programType as ProgramType,
    programSlug: e.programSlug,
    cohortSlug: e.cohortSlug,
  });
  const completedSet = new Set(
    progress.filter((p) => p.status === 'completed').map((p) => p.activityNotionId),
  );

  // Resume where you left off : pointe vers la 1re unit non-complétée
  const nextUnit = tree.units.find((u) => !completedSet.has(u.meta.notionId));
  const href = nextUnit
    ? `/programs/${e.programSlug}/${nextUnit.meta.slug}`
    : `/programs/${e.programSlug}`;

  const labels = unitLabelsFor(tree.meta.type);

  return {
    slug: e.programSlug,
    type: e.programType as ProgramType,
    cohortSlug: e.cohortSlug,
    enrolledAt: e.enrolledAt,
    completedAt: e.completedAt,
    completedCount: completedSet.size,
    totalUnits: tree.units.length,
    unitLabelPlural: labels.plural,
    title: tree.meta.title,
    href,
    coverImageUrl: tree.meta.coverImageUrl ?? null,
    thumbnailUrl: tree.meta.thumbnailUrl ?? null,
  };
}

export default async function MyLearningPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?next=/my-learning');
  }

  const enrollments = await listUserEnrollments(session.user.id);
  const userId = session.user.id;

  // Fetch tous les trees en parallèle (KV cache = rapide)
  const maybeCards = await Promise.all(enrollments.map((e) => loadCard(e, userId)));
  const cards: Card[] = maybeCards.filter((c): c is Card => c !== null);

  const active = cards.filter((c) => !c.completedAt);
  const done = cards.filter((c) => c.completedAt);

  // Si l'user n'a aucun enrollment, on vérifie combien de programmes publics
  // existent pour adapter l'empty state CTA.
  const publicProgramsCount =
    cards.length === 0 ? (await listPrograms({}).catch(() => [])).length : 0;

  return (
    <main className="learning-shell py-[var(--space-xl)]">
      <CompletionToast />
      <div className="mb-[var(--space-lg)]">
        <span className="eyebrow-pill">
          <span className="eyebrow-pill__dot" aria-hidden />
          Tableau de bord
        </span>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.4rem)] leading-[1.05] tracking-[-0.03em] font-bold text-[color:var(--text-primary)]">
          Mes programmes
        </h1>
        <p className="mt-2 text-[0.98rem] text-[color:var(--text-secondary)]">
          {cards.length === 0
            ? "Tu n'es inscrit.e à aucun programme pour l'instant."
            : `${active.length} en cours · ${done.length} terminé${done.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {cards.length === 0 ? (
        <EmptyState hasPublicPrograms={publicProgramsCount > 0} />
      ) : (
        <>
          {active.length > 0 && <Section title="En cours" cards={active} />}
          {done.length > 0 && <Section title="Terminés" cards={done} muted />}
        </>
      )}
    </main>
  );
}

function EmptyState({ hasPublicPrograms }: { hasPublicPrograms: boolean }) {
  return (
    <div className="rounded-[var(--r-l)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-[var(--space-xl)] text-center">
      <div className="mx-auto mb-[var(--space-md)] flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--accent-bg)] text-2xl" aria-hidden>
        🎯
      </div>
      <h2 className="font-[family-name:var(--font-display)] text-[1.3rem] font-semibold tracking-tight text-[color:var(--text-primary)]">
        Prêt.e à commencer ?
      </h2>
      <p className="mt-2 max-w-[44ch] mx-auto text-[0.95rem] text-[color:var(--text-secondary)]">
        {hasPublicPrograms
          ? 'Parcours les programmes disponibles et inscris-toi à ceux qui te parlent.'
          : 'Les programmes arrivent bientôt. En attendant, contacte-nous pour un accompagnement personnalisé.'}
      </p>
      <Link
        href={hasPublicPrograms ? '/programs' : '/'}
        className="btn btn-primary mt-[var(--space-md)] inline-flex"
        style={{ height: 44 }}
      >
        {hasPublicPrograms ? 'Parcourir les programmes →' : "Retour à l'accueil"}
      </Link>
    </div>
  );
}

function Section({ title, cards, muted = false }: { title: string; cards: Card[]; muted?: boolean }) {
  return (
    <section className="mt-[var(--space-xl)]">
      <h2 className="mb-[var(--space-md)] font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
        {title}
      </h2>
      <div className="grid gap-[var(--space-md)] sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <ProgramCard key={`${c.type}-${c.slug}-${c.cohortSlug ?? 'nc'}`} card={c} muted={muted} />
        ))}
      </div>
    </section>
  );
}

function ProgramCard({ card, muted = false }: { card: Card; muted?: boolean }) {
  const thumb = card.thumbnailUrl ?? card.coverImageUrl;
  return (
    <Link
      href={card.href}
      className="group flex flex-col overflow-hidden rounded-[var(--r-l)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] transition-colors duration-fast ease-out-quart hover:border-[color:var(--border-strong)]"
      style={{ opacity: muted ? 0.7 : 1 }}
    >
      <ProgramCardThumb src={thumb} title={card.title} />
      <div className="flex flex-1 flex-col gap-[var(--space-sm)] p-[var(--space-md)]">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
            {card.type === 'async' ? 'Programme' : card.type === 'sync' ? 'Sprint' : 'Événement'}
          </span>
          {card.cohortSlug ? (
            <span className="font-mono text-[10px] text-[color:var(--text-tertiary)]">· {card.cohortSlug}</span>
          ) : null}
        </div>
        <h3 className="font-[family-name:var(--font-display)] text-[1.1rem] font-semibold tracking-tight text-[color:var(--text-primary)]">
          {card.title}
        </h3>
        <div className="mt-auto pt-[var(--space-xs)]">
          {card.totalUnits > 0 ? (
            <ProgressBar
              completed={card.completedCount}
              total={card.totalUnits}
              unitLabelPlural={card.unitLabelPlural}
              compact
            />
          ) : (
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)]">
              Commencer
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
