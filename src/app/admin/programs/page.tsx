import Link from 'next/link';
import { listProgramStats } from '@/lib/admin/queries';
import { listPrograms } from '@/lib/programs';
import { getLastSyncAt, getLastSyncMapForSlugs } from '@/lib/programs-kv';
import { SyncAllButton } from '@/components/admin/SyncAllButton';
import { SyncProgramButton } from '@/components/admin/SyncProgramButton';
import { ShareButton } from '@/components/admin/ShareButton';
import type { ProgramMeta } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminProgramsPage() {
  const [stats, programs, lastSyncGlobal] = await Promise.all([
    listProgramStats(),
    listPrograms({ includeUnlisted: true, includeDrafts: true }),
    getLastSyncAt(),
  ]);
  const statsByKey = new Map(
    stats.map((s) => [`${s.programType}:${s.programSlug}`, s]),
  );
  const lastSyncPerSlug = await getLastSyncMapForSlugs(programs.map((p) => p.slug));

  const toItem = (p: ProgramMeta): Item => ({
    type: p.type,
    slug: p.slug,
    title: p.title,
    publishingStatus: p.publishingStatus ?? null,
    thumbnailUrl: p.thumbnailUrl ?? p.coverImageUrl ?? null,
    visibility: p.visibility,
    password: p.password ?? null,
    stats: statsByKey.get(`${p.type}:${p.slug}`) ?? { enrolled: 0, completed: 0 },
    lastSyncAt: lastSyncPerSlug[p.slug] ?? null,
  });

  const async_ = programs.filter((p) => p.type === 'async').map(toItem);
  const sync_ = programs.filter((p) => p.type === 'sync').map(toItem);
  const event_ = programs.filter((p) => p.type === 'event').map(toItem);

  return (
    <div className="space-y-[var(--space-xl)]">
      <section className="flex flex-col gap-[var(--space-md)] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.6rem,2.6vw,2rem)] font-bold tracking-tight text-[color:var(--text-primary)]">
            Programs
          </h1>
          <p className="mt-1 text-[0.9rem] text-[color:var(--text-secondary)]">
            {async_.length} async · {sync_.length} sync · {event_.length} event
            {' · '}stats live depuis Postgres
          </p>
        </div>
        <SyncAllButton lastSyncAt={lastSyncGlobal} />
      </section>

      <ProgramsTable title="Async" items={async_} />
      <ProgramsTable title="Sync" items={sync_} />
      <ProgramsTable title="Event" items={event_} />
    </div>
  );
}

type Item = {
  type: 'async' | 'sync' | 'event';
  slug: string;
  title: string;
  publishingStatus: 'draft' | 'published' | 'archived' | null;
  thumbnailUrl: string | null;
  visibility: 'public' | 'unlisted' | 'private';
  password: string | null;
  stats: { enrolled: number; completed: number };
  lastSyncAt: string | null;
};

function ProgramsTable({ title, items }: { title: string; items: Item[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-[var(--space-sm)] font-[family-name:var(--font-display)] text-[1.2rem] font-semibold text-[color:var(--text-primary)]">
        {title}
      </h2>
      <div className="overflow-hidden rounded-[var(--r-m)] border border-[color:var(--border-subtle)]">
        <table className="w-full">
          <thead className="bg-[color:var(--surface-1)]">
            <tr>
              <Th>Programme</Th>
              <Th>Status</Th>
              <Th>Visibilité</Th>
              <Th align="right">Enrollés</Th>
              <Th align="right">Terminés</Th>
              <Th align="right">Taux</Th>
              <Th>Sync</Th>
              <Th>Partage</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const rate = i.stats.enrolled > 0
                ? Math.round((i.stats.completed / i.stats.enrolled) * 100)
                : 0;
              const href = `/programs/${i.slug}`;
              return (
                <tr key={`${i.type}-${i.slug}`} className="border-t border-[color:var(--border-subtle)]">
                  <Td>
                    <div className="flex items-center gap-2">
                      {i.thumbnailUrl ? (
                        <div
                          className="h-6 w-10 shrink-0 rounded-[var(--r-xs)] bg-cover bg-center"
                          style={{ backgroundImage: `url(${i.thumbnailUrl})` }}
                          aria-hidden
                        />
                      ) : null}
                      <span>
                        <span className="text-[0.9rem]">{i.title}</span>
                        <span className="ml-2 font-mono text-[10px] text-[color:var(--text-tertiary)]">
                          {i.slug}
                        </span>
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <StatusBadge status={i.publishingStatus} />
                  </Td>
                  <Td>
                    <span className="font-mono text-[11px] text-[color:var(--text-tertiary)]">
                      {i.visibility}
                    </span>
                  </Td>
                  <Td align="right" mono>{i.stats.enrolled}</Td>
                  <Td align="right" mono>{i.stats.completed}</Td>
                  <Td align="right" mono>{rate}%</Td>
                  <Td>
                    <SyncProgramButton slug={i.slug} lastSyncAt={i.lastSyncAt} />
                  </Td>
                  <Td>
                    <ShareButton
                      programSlug={i.slug}
                      programTitle={i.title}
                      visibility={i.visibility}
                      password={i.password}
                    />
                  </Td>
                  <Td align="right">
                    <div className="inline-flex items-center gap-2">
                      <a
                        href={`/api/admin/programs/${i.slug}/enrollments.csv`}
                        title={`Exporter les enrollments de ${i.title} en CSV`}
                        className="font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"
                      >
                        CSV ↓
                      </a>
                      <Link
                        href={href}
                        target="_blank"
                        rel="noopener"
                        className="font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--accent-edge)] hover:underline"
                      >
                        Voir ↗
                      </Link>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: 'draft' | 'published' | 'archived' | null }) {
  const value = status ?? 'unset';
  const colors: Record<string, { bg: string; fg: string }> = {
    published: { bg: 'var(--signal-success-bg)', fg: 'var(--signal-success)' },
    draft: { bg: 'var(--accent-bg)', fg: 'var(--accent-edge)' },
    archived: { bg: 'var(--surface-2)', fg: 'var(--text-tertiary)' },
    unset: { bg: 'var(--surface-2)', fg: 'var(--text-tertiary)' },
  };
  const c = colors[value] ?? colors.unset;
  return (
    <span
      className="inline-flex rounded-[var(--r-xs)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]"
      style={{ background: c.bg, color: c.fg }}
    >
      {value}
    </span>
  );
}

function Th({ children, align = 'left' }: { children?: React.ReactNode; align?: 'left' | 'right' }) {
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
