import Link from 'next/link';
import { listUsersWithStats } from '@/lib/admin/queries';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const users = await listUsersWithStats();

  return (
    <div className="space-y-[var(--space-lg)]">
      <section>
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.6rem,2.6vw,2rem)] font-bold tracking-tight text-[color:var(--text-primary)]">
          Users
        </h1>
        <p className="mt-1 text-[0.9rem] text-[color:var(--text-secondary)]">
          {users.length} user{users.length > 1 ? 's' : ''} · tri par date de création (plus récent en haut)
        </p>
      </section>

      {users.length === 0 ? (
        <div className="rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-[var(--space-lg)] text-center">
          <p className="text-[0.95rem] text-[color:var(--text-secondary)]">
            Aucun user inscrit pour l&apos;instant. Le premier login via magic link en crée un automatiquement.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--r-m)] border border-[color:var(--border-subtle)]">
          <table className="w-full">
            <thead className="bg-[color:var(--surface-1)]">
              <tr>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Verified</Th>
                <Th align="right">Enrollments</Th>
                <Th align="right">Completions</Th>
                <Th>Inscrit</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[color:var(--border-subtle)]">
                  <Td>
                    <div className="flex flex-col">
                      <span className="text-[0.9rem]">{u.email}</span>
                      {u.name ? (
                        <span className="text-[0.8rem] text-[color:var(--text-tertiary)]">{u.name}</span>
                      ) : null}
                    </div>
                  </Td>
                  <Td>
                    <RoleBadge role={u.role} />
                  </Td>
                  <Td>
                    <span className="font-mono text-[11px] text-[color:var(--text-tertiary)]">
                      {u.emailVerified ? '✓' : '—'}
                    </span>
                  </Td>
                  <Td align="right" mono>{u.enrollmentCount}</Td>
                  <Td align="right" mono>{u.completedCount}</Td>
                  <Td>
                    <span className="font-mono text-[11px] text-[color:var(--text-tertiary)]">
                      {new Date(u.createdAt).toISOString().slice(0, 10)}
                    </span>
                  </Td>
                  <Td align="right">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--accent-edge)] hover:underline"
                    >
                      Détail →
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: 'admin' | 'learner' | null }) {
  const r = role ?? 'learner';
  const isAdmin = r === 'admin';
  return (
    <span
      className="inline-flex items-center rounded-[var(--r-xs)] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em]"
      style={
        isAdmin
          ? { background: 'var(--accent)', color: 'var(--accent-ink)' }
          : { background: 'var(--surface-2)', color: 'var(--text-secondary)' }
      }
    >
      {r}
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
