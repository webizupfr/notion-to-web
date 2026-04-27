'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Error boundary global — attrape toutes les erreurs non gérées côté client.
 * Pour les erreurs spécifiques à une zone, créer un error.tsx dans la route
 * (ex: app/(site)/error.tsx pour le site public).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log côté console dev · en prod, Sentry capture automatiquement via son hook.
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div
      className="min-h-dvh"
      style={{ background: 'var(--surface-0)', color: 'var(--text-primary)' }}
    >
      <div className="mx-auto flex min-h-dvh max-w-[36rem] flex-col items-center justify-center px-6 py-16 text-center">
        <div
          aria-hidden
          className="mb-6 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
          style={{ background: 'var(--accent-bg)' }}
        >
          ⚡
        </div>

        <h1
          className="font-[family-name:var(--font-display)] text-[clamp(1.5rem,3vw,1.9rem)] font-bold leading-tight tracking-[-0.02em]"
        >
          Oups — quelque chose a cassé
        </h1>

        <p
          className="mt-3 text-[0.95rem] leading-[1.6]"
          style={{ color: 'var(--text-secondary)' }}
        >
          On a enregistré l&apos;erreur. Tu peux réessayer, ou retourner à l&apos;accueil.
        </p>

        {error.digest ? (
          <p
            className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            ref {error.digest}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={reset} className="btn btn-primary" style={{ height: 40 }}>
            Réessayer
          </button>
          <Link href="/" className="btn btn-secondary" style={{ height: 40 }}>
            Retour accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
