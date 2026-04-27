import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireAdmin } from '@/lib/admin/guard';
import { signOut } from '@/auth';
import { brand } from '@/config/brand';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();

  async function logoutAction() {
    'use server';
    await signOut({ redirectTo: '/' });
  }

  return (
    <div className="min-h-dvh bg-[color:var(--surface-0)]">
      <header className="border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]">
        <div className="learning-shell flex items-center justify-between py-3">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="eyebrow-pill">
              <span className="eyebrow-pill__dot" aria-hidden />
              {brand.name} · Admin
            </Link>
            <nav className="flex gap-1">
              <AdminNavLink href="/admin" label="Overview" />
              <AdminNavLink href="/admin/analytics" label="Analytics" />
              <AdminNavLink href="/admin/users" label="Users" />
              <AdminNavLink href="/admin/programs" label="Programs" />
              <AdminNavLink href="/admin/promos" label="Promos" />
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-[color:var(--text-tertiary)]">
              {user.email} · admin
            </span>
            <Link
              href="/my-learning"
              className="btn btn-ghost"
              style={{ height: 32, padding: '0 10px', fontSize: 13 }}
            >
              Mon espace
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="btn btn-ghost"
                style={{ height: 32, padding: '0 10px', fontSize: 13 }}
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="learning-shell py-[var(--space-xl)]">{children}</main>
    </div>
  );
}

function AdminNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-[var(--r-xs)] px-2 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-1)] hover:text-[color:var(--text-primary)]"
    >
      {label}
    </Link>
  );
}
