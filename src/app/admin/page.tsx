import Link from 'next/link';
import { getOverview, listProgramStats } from '@/lib/admin/queries';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const stats = await getOverview();
  const programs = await listProgramStats();

  return (
    <div className="space-y-[var(--space-xl)]">
      <section>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.6rem,2.6vw,2rem)] font-bold tracking-tight text-[color:var(--text-primary)]">
          Overview
        </h1>
        <p className="mt-1 text-[0.9rem] text-[color:var(--text-secondary)]">
          État global du LMS. Toutes les données viennent de Postgres (temps réel).
        </p>
      </section>

      <section className="grid gap-[var(--space-md)] sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={stats.totalUsers} />
        <StatCard label="Enrollments" value={stats.totalEnrollments} sub={`${stats.activeEnrollments} actifs`} />
        <StatCard label="Activités complétées" value={stats.totalCompletedActivities} />
        <StatCard
          label="Taux"
          value={
            stats.totalEnrollments > 0
              ? `${Math.round((stats.totalCompletedActivities / stats.totalEnrollments) * 10) / 10}`
              : '—'
          }
          sub="activités par enrollment"
        />
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-[1.3rem] font-semibold text-[color:var(--text-primary)]">
            Programmes
          </h2>
          <Link
            href="/admin/users"
            className="font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"
          >
            Voir users →
          </Link>
        </div>

        {programs.length === 0 ? (
          <p className="mt-[var(--space-md)] text-[0.9rem] text-[color:var(--text-secondary)]">
            Aucun enrollment encore. Les premiers apprenants apparaîtront ici.
          </p>
        ) : (
          <div className="mt-[var(--space-md)] overflow-hidden rounded-[var(--r-m)] border border-[color:var(--border-subtle)]">
            <table className="w-full">
              <thead className="bg-[color:var(--surface-1)]">
                <tr>
                  <Th>Programme</Th>
                  <Th>Type</Th>
                  <Th align="right">Enrollés</Th>
                  <Th align="right">Terminés</Th>
                  <Th align="right">Taux</Th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p) => {
                  const rate =
                    p.enrolled > 0 ? Math.round((p.completed / p.enrolled) * 100) : 0;
                  const href = `/programs/${p.programSlug}`;
                  return (
                    <tr
                      key={`${p.programType}-${p.programSlug}`}
                      className="border-t border-[color:var(--border-subtle)]"
                    >
                      <Td>
                        <Link href={href} className="underline hover:text-[color:var(--accent-edge)]">
                          {p.programSlug}
                        </Link>
                      </Td>
                      <Td>
                        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                          {p.programType}
                        </span>
                      </Td>
                      <Td align="right" mono>{p.enrolled}</Td>
                      <Td align="right" mono>{p.completed}</Td>
                      <Td align="right" mono>{rate}%</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-[var(--space-md)]">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
        {label}
      </div>
      <div className="mt-1 font-[family-name:var(--font-display)] text-[2rem] font-bold leading-none text-[color:var(--text-primary)]">
        {value}
      </div>
      {sub ? (
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
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
      className={`px-3 py-2 text-[0.9rem] text-[color:var(--text-primary)] ${mono ? 'font-mono' : ''}`}
      style={{ textAlign: align }}
    >
      {children}
    </td>
  );
}
