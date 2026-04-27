import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { brand } from '@/config/brand';

/**
 * Header global minimal — affiché sur toutes les pages publiques et `/my-learning`.
 *
 *   Non connecté : logo · Programmes · Connexion
 *   Connecté :     logo · Programmes · Mes programmes · {email + logout menu}
 *
 * Server component : lit la session en SSR pour éviter le flash "pas connecté".
 */

export async function AppHeader() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user);
  const isAdmin = session?.user?.role === 'admin';
  const userEmail = session?.user?.email ?? null;

  async function logoutAction() {
    'use server';
    await signOut({ redirectTo: '/' });
  }

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] border-b border-[color:var(--border-subtle)] bg-[color-mix(in_oklab,var(--surface-0)_88%,transparent)] backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-[var(--space-md)] px-[clamp(16px,2vw,28px)] py-3">
        <Link
          href={isLoggedIn ? '/my-learning' : '/'}
          className="inline-flex items-center gap-2 text-[color:var(--text-primary)] hover:text-[color:var(--accent-edge)]"
          aria-label={brand.name}
        >
          <span
            aria-hidden
            className="inline-block h-2 w-2 rounded-full bg-[color:var(--accent)]"
          />
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

          {isLoggedIn ? (
            <>
              <Link
                href="/my-learning"
                className="rounded-[var(--r-xs)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-1)] hover:text-[color:var(--text-primary)]"
              >
                Mon espace
              </Link>
              {isAdmin ? (
                <Link
                  href="/admin"
                  className="rounded-[var(--r-xs)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--accent-edge)] hover:bg-[color:var(--accent-bg)]"
                >
                  Admin
                </Link>
              ) : null}
              <div className="ml-[var(--space-xs)] flex items-center gap-1 border-l border-[color:var(--border-subtle)] pl-[var(--space-sm)]">
                <Link
                  href="/account"
                  className="hidden rounded-[var(--r-xs)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-1)] hover:text-[color:var(--text-primary)] sm:inline-flex"
                  title={userEmail ?? undefined}
                >
                  Mon compte
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="rounded-[var(--r-xs)] px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)] hover:bg-[color:var(--surface-1)] hover:text-[color:var(--text-primary)]"
                  >
                    Logout
                  </button>
                </form>
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="ml-[var(--space-xs)] btn btn-primary"
              style={{ height: 32, padding: '0 14px', fontSize: 12 }}
            >
              Se connecter
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
