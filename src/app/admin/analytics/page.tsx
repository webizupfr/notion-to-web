import Link from 'next/link';

import { requireAdmin } from '@/lib/admin/guard';
import {
  getKpis,
  getEnrollmentsOverTime,
  getRevenuePerMonth,
  getTopPrograms,
  getDropoffPerUnit,
  getEnrolledProgramSlugs,
  rangeFromKey,
  type RangeKey,
} from '@/lib/admin/analytics';
import { getProgramTree } from '@/lib/programs';
import { DateRangeFilter } from '@/components/admin/DateRangeFilter';
import {
  EnrollmentsOverTimeChart,
  RevenuePerMonthChart,
  TopProgramsChart,
  DropoffChart,
} from '@/components/admin/AnalyticsCharts';

/**
 * Dashboard analytics — vue admin globale du LMS.
 *
 *   /admin/analytics?range=30d&program=challenge-ia
 *
 * Layout :
 *   - 4 KPI cards (apprenants · revenue total · revenue mois · taux complétion)
 *   - Filtre période en haut (7d / 30d / 90d / 12m / all)
 *   - 2x2 grid de charts :
 *     1. Inscriptions dans le temps (line)
 *     2. Revenus par mois (bar, 12 derniers mois indépendamment du filter)
 *     3. Top programmes (bar horizontal)
 *     4. Dropoff par unit (bar, sélecteur programme)
 *
 * Toutes les data sont calculées côté serveur via SQL aggregations Postgres.
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_RANGES: RangeKey[] = ['7d', '30d', '90d', '12m', 'all'];

function parseRange(raw: string | undefined): RangeKey {
  return VALID_RANGES.includes(raw as RangeKey) ? (raw as RangeKey) : '30d';
}

function formatCents(cents: number, currency = 'EUR'): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
  } catch {
    return `${cents / 100} ${currency}`;
  }
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string>>;
}) {
  await requireAdmin();
  const sp = (await searchParams?.catch(() => undefined)) || {};
  const range = parseRange(sp.range);
  const dropoffProgramSlug = sp.program ?? null;

  const dateRange = rangeFromKey(range);

  // Fetch tout en parallèle
  const [kpis, enrollmentsOverTime, revenuePerMonth, topPrograms, allProgramSlugs] =
    await Promise.all([
      getKpis(dateRange),
      getEnrollmentsOverTime(dateRange),
      getRevenuePerMonth(12),
      getTopPrograms(10),
      getEnrolledProgramSlugs(),
    ]);

  // Dropoff : si un programme est sélectionné OU si y'a un seul programme dans la liste
  const selectedDropoffSlug =
    dropoffProgramSlug ?? topPrograms[0]?.programSlug ?? null;

  type DropoffPoint = {
    label: string;
    order: number;
    completed: number;
    retentionPct: number;
  };
  let dropoffData: DropoffPoint[] = [];
  if (selectedDropoffSlug) {
    const [tree, raw] = await Promise.all([
      getProgramTree(selectedDropoffSlug),
      getDropoffPerUnit(selectedDropoffSlug),
    ]);
    if (tree && raw.length > 0) {
      const completedById = new Map(raw.map((r) => [r.activityNotionId, r.completedCount]));
      const firstUnitCount = tree.units[0]
        ? completedById.get(tree.units[0].meta.notionId) ?? 0
        : 0;
      dropoffData = tree.units.map((u) => {
        const completed = completedById.get(u.meta.notionId) ?? 0;
        const retentionPct =
          firstUnitCount > 0 ? Math.round((completed / firstUnitCount) * 100) : 0;
        return {
          label: u.meta.title || u.meta.slug,
          order: u.meta.order ?? 0,
          completed,
          retentionPct,
        };
      });
    }
  }

  return (
    <div className="space-y-[var(--space-xl)]">
      <section className="flex flex-col gap-[var(--space-md)] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.6rem,2.6vw,2rem)] font-bold tracking-tight text-[color:var(--text-primary)]">
            Analytics
          </h1>
          <p className="mt-1 text-[0.9rem] text-[color:var(--text-secondary)]">
            Vue d&apos;ensemble du LMS · données live depuis Postgres
          </p>
        </div>
      </section>

      <DateRangeFilter current={range} basePath="/admin/analytics" />

      {/* ─── KPI Cards ─── */}
      <section className="grid gap-[var(--space-md)] sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Apprenants"
          value={kpis.totalLearners.toString()}
          hint="distinct sur la période"
        />
        <KpiCard
          label="Revenue total"
          value={formatCents(kpis.totalRevenueCents)}
          hint="hors remboursements"
        />
        <KpiCard
          label="Revenue ce mois"
          value={formatCents(kpis.thisMonthRevenueCents)}
          hint={`mois en cours`}
        />
        <KpiCard
          label="Taux complétion"
          value={`${kpis.averageCompletionRate}%`}
          hint="moyenne enrollments"
        />
      </section>

      {/* ─── Charts grid ─── */}
      <section className="grid gap-[var(--space-md)] lg:grid-cols-2">
        <ChartCard
          title="Inscriptions dans le temps"
          subtitle={`Période : ${rangeLabel(range)}`}
        >
          <EnrollmentsOverTimeChart data={enrollmentsOverTime} />
        </ChartCard>

        <ChartCard
          title="Revenus par mois"
          subtitle="12 derniers mois"
        >
          <RevenuePerMonthChart data={revenuePerMonth} />
        </ChartCard>

        <ChartCard
          title="Top programmes"
          subtitle={`Top ${Math.min(10, topPrograms.length)} par inscriptions`}
        >
          <TopProgramsChart data={topPrograms} />
        </ChartCard>

        <ChartCard
          title="Dropoff par unité"
          subtitle={
            selectedDropoffSlug
              ? `Programme : ${selectedDropoffSlug}`
              : 'Aucun programme avec enrollments'
          }
          headerSlot={
            allProgramSlugs.length > 1 && selectedDropoffSlug ? (
              <ProgramSelector
                programs={allProgramSlugs}
                current={selectedDropoffSlug}
                range={range}
              />
            ) : null
          }
        >
          <DropoffChart data={dropoffData} />
        </ChartCard>
      </section>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function rangeLabel(range: RangeKey): string {
  switch (range) {
    case '7d':
      return '7 derniers jours';
    case '30d':
      return '30 derniers jours';
    case '90d':
      return '90 derniers jours';
    case '12m':
      return '12 derniers mois';
    case 'all':
      return 'tout l\'historique';
  }
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[var(--r-l)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-[var(--space-lg)]">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-[clamp(1.6rem,2.4vw,2rem)] font-bold tracking-tight text-[color:var(--text-primary)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] text-[color:var(--text-tertiary)]">{hint}</p>
      ) : null}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  headerSlot,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerSlot?: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--r-l)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-[var(--space-lg)]">
      <div className="mb-[var(--space-md)] flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[1rem] font-semibold text-[color:var(--text-primary)]">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {headerSlot ? <div>{headerSlot}</div> : null}
      </div>
      {children}
    </div>
  );
}

function ProgramSelector({
  programs,
  current,
  range,
}: {
  programs: string[];
  current: string;
  range: RangeKey;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {programs.slice(0, 5).map((slug) => {
        const isActive = slug === current;
        const params = new URLSearchParams();
        if (range !== '30d') params.set('range', range);
        params.set('program', slug);
        return (
          <Link
            key={slug}
            href={`/admin/analytics?${params.toString()}`}
            className={`rounded-[var(--r-xs)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors ${
              isActive
                ? 'bg-[color:var(--accent-bg)] text-[color:var(--accent-edge)]'
                : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-1)] hover:text-[color:var(--text-primary)]'
            }`}
            aria-current={isActive ? 'page' : undefined}
            title={slug}
          >
            {slug.length > 16 ? `${slug.slice(0, 15)}…` : slug}
          </Link>
        );
      })}
    </div>
  );
}
