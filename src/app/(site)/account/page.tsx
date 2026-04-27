import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';

import { auth, signOut } from '@/auth';
import { db, users } from '@/lib/db';
import { listUserEnrollments, getProgramProgress } from '@/lib/db/progress';
import { listUserPurchases } from '@/lib/db/purchases';
import { getCertificate } from '@/lib/db/certificates';
import { getProgramTree } from '@/lib/programs';
import type { Enrollment, Purchase, ProgramType } from '@/lib/db';

import { NameForm } from './NameForm';

/**
 * Page profil apprenant.
 *
 * Style : "Stripe Dashboard" — sections empilées avec headers + cards
 * blanches sur surface-1 légère, padding aéré, typo subtle.
 *
 *   ┌──────────────────────────────┐
 *   │ Mon profil                   │
 *   │  • Nom (editable)            │
 *   │  • Email (read-only)         │
 *   ├──────────────────────────────┤
 *   │ Mes inscriptions             │
 *   │  • Liste compacte programmes │
 *   ├──────────────────────────────┤
 *   │ Historique d'achats          │
 *   │  • Date / programme / facture│
 *   ├──────────────────────────────┤
 *   │ Compte → Logout              │
 *   └──────────────────────────────┘
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mon compte',
  robots: { index: false, follow: false },
};

type ProgramSummary = {
  slug: string;
  type: ProgramType;
  title: string;
  cohortSlug: string | null;
  totalUnits: number;
  completedUnits: number;
  hasCertificate: boolean;
  enrolledAt: Date;
};

async function loadProgramSummary(
  enrollment: Enrollment,
  userId: string,
): Promise<ProgramSummary | null> {
  const tree = await getProgramTree(enrollment.programSlug);
  if (!tree) return null;

  const [progress, cert] = await Promise.all([
    getProgramProgress({
      userId,
      programType: enrollment.programType as ProgramType,
      programSlug: enrollment.programSlug,
      cohortSlug: enrollment.cohortSlug,
    }),
    getCertificate({ userId, programSlug: enrollment.programSlug }),
  ]);
  const completedUnits = new Set(
    progress.filter((p) => p.status === 'completed').map((p) => p.activityNotionId),
  );
  const completedCount = tree.units.filter((u) => completedUnits.has(u.meta.notionId)).length;
  // Le bouton apparaît dès 100% + certificateEnabled. Le click sur l'endpoint
  // émet le cert (idempotent) → pas besoin que la row existe déjà.
  // Si déjà émis et révoqué → on cache le bouton.
  const isCompleted = tree.units.length > 0 && completedCount === tree.units.length;
  const isRevoked = Boolean(cert?.revokedAt);
  return {
    slug: enrollment.programSlug,
    type: enrollment.programType as ProgramType,
    title: tree.meta.title,
    cohortSlug: enrollment.cohortSlug,
    totalUnits: tree.units.length,
    completedUnits: completedCount,
    hasCertificate: isCompleted && Boolean(tree.meta.certificateEnabled) && !isRevoked,
    enrolledAt: enrollment.enrolledAt,
  };
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  });
}

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
    }).format(amount / 100);
  } catch {
    return `${amount / 100} ${currency}`;
  }
}

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    redirect('/login?next=/account');
  }
  const userId = session.user.id;
  const userEmail = session.user.email;

  // Récupère le user complet (le name peut être null)
  const userRows = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const userRow = userRows[0];
  const currentName = userRow?.name ?? '';

  // Inscriptions + achats en parallèle
  const [enrollments, purchases] = await Promise.all([
    listUserEnrollments(userId),
    listUserPurchases(userId),
  ]);

  const summaryResults = await Promise.all(
    enrollments.map((e) => loadProgramSummary(e, userId)),
  );
  const summaries: ProgramSummary[] = summaryResults.filter(
    (s): s is ProgramSummary => s !== null,
  );

  async function logoutAction() {
    'use server';
    await signOut({ redirectTo: '/' });
  }

  return (
    <main className="mx-auto max-w-[860px] px-[clamp(20px,3vw,32px)] py-[clamp(32px,4vw,56px)]">
      {/* En-tête */}
      <header className="mb-[var(--space-xl)]">
        <span className="eyebrow-pill">
          <span className="eyebrow-pill__dot" aria-hidden />
          Mon compte
        </span>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(1.6rem,2.6vw,2rem)] font-bold tracking-tight text-[color:var(--text-primary)]">
          {currentName ? `Bonjour ${currentName.split(' ')[0]}` : 'Bonjour'}
        </h1>
        <p className="mt-2 text-[0.95rem] text-[color:var(--text-secondary)]">
          Gère tes informations, suis tes inscriptions et retrouve tes factures.
        </p>
      </header>

      {/* Section Profil */}
      <Section title="Mon profil">
        <div className="grid gap-[var(--space-lg)] sm:grid-cols-[2fr_1fr]">
          <NameForm currentName={currentName} />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
              Email
            </p>
            <p className="mt-2 truncate text-[0.95rem] text-[color:var(--text-primary)]">
              {userEmail}
            </p>
            <p className="mt-1 text-[11px] text-[color:var(--text-tertiary)]">
              Non modifiable. Pour changer d&apos;email, contacte-nous.
            </p>
          </div>
        </div>
      </Section>

      {/* Section Inscriptions */}
      <Section title="Mes inscriptions">
        {summaries.length === 0 ? (
          <EmptyState
            label="Tu n'es inscrit·e à aucun programme pour l'instant."
            action={{ href: '/programs', label: 'Parcourir les programmes →' }}
          />
        ) : (
          <ul className="divide-y divide-[color:var(--border-subtle)]">
            {summaries.map((s) => (
              <li key={`${s.type}-${s.slug}-${s.cohortSlug ?? 'nc'}`}>
                <ProgramRow program={s} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Section Achats */}
      <Section title="Historique d'achats">
        {purchases.length === 0 ? (
          <EmptyState
            label="Aucun achat sur ton compte. Les programmes gratuits n'apparaissent pas ici."
          />
        ) : (
          <div className="overflow-hidden rounded-[var(--r-s)] border border-[color:var(--border-subtle)]">
            <table className="w-full">
              <thead className="bg-[color:var(--surface-1)]">
                <tr>
                  <Th>Date</Th>
                  <Th>Programme</Th>
                  <Th align="right">Montant</Th>
                  <Th align="right">Facture</Th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-t border-[color:var(--border-subtle)]">
                    <Td>{formatDate(p.paidAt ?? p.createdAt)}</Td>
                    <Td>
                      <Link
                        href={`/programs/${p.programSlug}`}
                        className="text-[color:var(--text-primary)] hover:text-[color:var(--accent-edge)] hover:underline"
                      >
                        {p.programSlug}
                      </Link>
                      {p.refundedAt ? (
                        <span className="ml-2 rounded-[var(--r-xs)] bg-[color:var(--surface-2)] px-1.5 py-0.5 font-mono text-[10px] uppercase text-[color:var(--text-tertiary)]">
                          Remboursé
                        </span>
                      ) : null}
                    </Td>
                    <Td align="right" mono>
                      {formatAmount(p.amount, p.currency)}
                    </Td>
                    <Td align="right">
                      <PurchaseInvoiceLink purchase={p} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Section Compte */}
      <Section title="Compte">
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-[var(--r-s)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
          >
            Se déconnecter
          </button>
        </form>
      </Section>
    </main>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-[var(--space-xl)]">
      <h2 className="mb-[var(--space-md)] font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
        {title}
      </h2>
      <div className="rounded-[var(--r-l)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-[clamp(20px,3vw,28px)]">
        {children}
      </div>
    </section>
  );
}

function EmptyState({
  label,
  action,
}: {
  label: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="text-center">
      <p className="text-[0.95rem] text-[color:var(--text-secondary)]">{label}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-[var(--space-sm)] inline-block font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--accent-edge)] hover:underline"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

function ProgramRow({ program }: { program: ProgramSummary }) {
  const progressPct = program.totalUnits > 0
    ? Math.round((program.completedUnits / program.totalUnits) * 100)
    : 0;
  const isComplete = program.totalUnits > 0 && program.completedUnits === program.totalUnits;

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/programs/${program.slug}`}
            className="truncate text-[0.95rem] font-semibold text-[color:var(--text-primary)] hover:text-[color:var(--accent-edge)]"
          >
            {program.title}
          </Link>
          {isComplete ? (
            <span className="rounded-[var(--r-xs)] bg-[color:var(--accent-bg)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[color:var(--accent-edge)]">
              Terminé
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
          {program.completedUnits}/{program.totalUnits} unités · {progressPct}%
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {program.hasCertificate ? (
          <a
            href={`/api/certificates/${program.slug}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 rounded-[var(--r-xs)] border border-[color:var(--accent-edge)] bg-[color:var(--accent-bg)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[color:var(--accent-edge)] hover:bg-[color:var(--accent)] hover:text-[color:var(--accent-ink)]"
            title="Télécharger le certificat PDF"
          >
            📜 Certificat
          </a>
        ) : null}
        <Link
          href={`/programs/${program.slug}`}
          className="inline-flex items-center gap-1 rounded-[var(--r-xs)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
        >
          {isComplete ? 'Revoir' : 'Continuer'} →
        </Link>
      </div>
    </div>
  );
}

function PurchaseInvoiceLink({ purchase }: { purchase: Purchase }) {
  const url = purchase.invoiceUrl ?? purchase.invoicePdfUrl;
  if (!url) {
    return (
      <span className="font-mono text-[10px] uppercase text-[color:var(--text-tertiary)]">
        —
      </span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener"
      className="font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--accent-edge)] hover:underline"
    >
      📄 Voir
    </a>
  );
}

function Th({
  children,
  align = 'left',
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className="px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]"
      style={{ textAlign: align }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
  mono = false,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  mono?: boolean;
}) {
  return (
    <td
      className={`px-3 py-2.5 text-[0.9rem] text-[color:var(--text-primary)] ${
        mono ? 'font-mono' : ''
      }`}
      style={{ textAlign: align }}
    >
      {children}
    </td>
  );
}
