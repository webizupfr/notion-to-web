import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getUserDetail } from '@/lib/admin/queries';
import { toggleUserRole, resetUserProgress, unenrollUser } from '@/lib/admin/actions';

export const dynamic = 'force-dynamic';

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getUserDetail(id);
  if (!data) return notFound();

  const { user, enrollments, progress } = data;

  return (
    <div className="space-y-[var(--space-xl)]">
      <section className="flex items-baseline justify-between">
        <div>
          <Link
            href="/admin/users"
            className="font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"
          >
            ← Users
          </Link>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-[clamp(1.6rem,2.6vw,2rem)] font-bold tracking-tight text-[color:var(--text-primary)]">
            {user.name || user.email}
          </h1>
          <p className="mt-1 font-mono text-[11px] text-[color:var(--text-tertiary)]">
            id={user.id.slice(0, 8)}… · inscrit {new Date(user.createdAt).toISOString().slice(0, 10)}
            {user.emailVerified ? ' · email verified' : ''}
          </p>
        </div>
        <form
          action={async () => {
            'use server';
            await toggleUserRole(user.id);
          }}
        >
          <button type="submit" className="btn btn-secondary" style={{ height: 36 }}>
            {user.role === 'admin' ? 'Rétrograder en learner' : 'Promouvoir admin'}
          </button>
        </form>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-[1.2rem] font-semibold text-[color:var(--text-primary)]">
            Enrollments
          </h2>
          <span className="font-mono text-[11px] text-[color:var(--text-tertiary)]">
            {enrollments.length} total
          </span>
        </div>

        {enrollments.length === 0 ? (
          <p className="mt-[var(--space-sm)] text-[0.9rem] text-[color:var(--text-secondary)]">
            Cet user n&apos;est inscrit à rien.
          </p>
        ) : (
          <div className="mt-[var(--space-sm)] space-y-2">
            {enrollments.map((e) => {
              const completedCount = progress.filter(
                (p) => p.programSlug === e.programSlug && p.status === 'completed',
              ).length;
              const href = `/programs/${e.programSlug}`;
              return (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-[var(--space-sm)]"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="inline-flex items-center rounded-[var(--r-xs)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                    >
                      {e.programType}
                    </span>
                    <Link href={href} className="text-[0.95rem] hover:text-[color:var(--accent-edge)]">
                      {e.programSlug}
                    </Link>
                    {e.cohortSlug ? (
                      <span className="font-mono text-[11px] text-[color:var(--text-tertiary)]">
                        · {e.cohortSlug}
                      </span>
                    ) : null}
                    <span className="font-mono text-[11px] text-[color:var(--text-tertiary)]">
                      · {completedCount} activité{completedCount > 1 ? 's' : ''} complétée{completedCount > 1 ? 's' : ''}
                    </span>
                  </div>
                  <form
                    action={async () => {
                      'use server';
                      await unenrollUser(e.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--signal-danger)] hover:underline"
                    >
                      Désinscrire
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-[1.2rem] font-semibold text-[color:var(--text-primary)]">
            Progression
          </h2>
          <span className="font-mono text-[11px] text-[color:var(--text-tertiary)]">
            {progress.length} activité{progress.length > 1 ? 's' : ''} trackée{progress.length > 1 ? 's' : ''}
          </span>
        </div>

        {progress.length === 0 ? (
          <p className="mt-[var(--space-sm)] text-[0.9rem] text-[color:var(--text-secondary)]">
            Aucune activité complétée.
          </p>
        ) : (
          <>
            <div className="mt-[var(--space-sm)] overflow-hidden rounded-[var(--r-m)] border border-[color:var(--border-subtle)]">
              <table className="w-full">
                <thead className="bg-[color:var(--surface-1)]">
                  <tr>
                    <Th>Programme</Th>
                    <Th>Activité</Th>
                    <Th>Status</Th>
                    <Th>Complétée le</Th>
                  </tr>
                </thead>
                <tbody>
                  {progress.map((p) => (
                    <tr key={p.id} className="border-t border-[color:var(--border-subtle)]">
                      <Td mono>{p.programSlug}</Td>
                      <Td>
                        <span className="font-mono text-[11px]">
                          {p.activitySlug ?? p.activityNotionId.slice(0, 8) + '…'}
                        </span>
                      </Td>
                      <Td>
                        <span
                          className="inline-flex rounded-[var(--r-xs)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]"
                          style={
                            p.status === 'completed'
                              ? { background: 'var(--signal-success-bg)', color: 'var(--signal-success)' }
                              : { background: 'var(--surface-2)', color: 'var(--text-secondary)' }
                          }
                        >
                          {p.status}
                        </span>
                      </Td>
                      <Td mono>
                        {p.completedAt ? new Date(p.completedAt).toISOString().slice(0, 16).replace('T', ' ') : '—'}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <form
              className="mt-[var(--space-md)]"
              action={async () => {
                'use server';
                await resetUserProgress(user.id);
              }}
            >
              <button
                type="submit"
                className="btn btn-secondary"
                style={{ height: 32, padding: '0 12px', fontSize: 12 }}
              >
                Reset toute la progression
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="px-3 py-2 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]"
    >
      {children}
    </th>
  );
}

function Td({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`px-3 py-2 text-[0.9rem] text-[color:var(--text-primary)] ${mono ? 'font-mono text-[12px]' : ''}`}>
      {children}
    </td>
  );
}
