import Link from 'next/link';
import type { Metadata } from 'next';

import { getCertificateByCode } from '@/lib/db/certificates';
import { brand } from '@/config/brand';

/**
 * Page publique de vérification d'un certificat.
 *
 * Accessible SANS authentification : permet à un recruteur, un client ou
 * un tiers de vérifier qu'un certificat est bien valide en visitant
 * l'URL imprimée sur le PDF.
 *
 * Comportement :
 *   - Code valide + non révoqué → carte "✓ Certificat valide" + détails
 *   - Code valide + révoqué    → "⚠ Certificat révoqué"
 *   - Code invalide / inconnu  → "✗ Aucun certificat trouvé"
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Vérification de certificat',
  description: `Vérifier l'authenticité d'un certificat ${brand.name}`,
  robots: { index: false, follow: false },
};

function formatFrDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  });
}

export default async function CertVerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const cert = await getCertificateByCode(code);

  return (
    <div className="min-h-dvh bg-[color:var(--surface-0)]">
      {/* Header minimal */}
      <header className="border-b border-[color:var(--border-subtle)] py-[var(--space-md)]">
        <div className="mx-auto flex max-w-[800px] items-center justify-between px-[clamp(20px,3vw,32px)]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[color:var(--text-primary)]"
          >
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full bg-[color:var(--accent)]"
            />
            <span className="font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-tight">
              {brand.name}
            </span>
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
            Vérification certificat
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[640px] px-[clamp(20px,3vw,32px)] py-[clamp(48px,6vw,80px)]">
        {!cert ? (
          <CardInvalid code={code} />
        ) : cert.revokedAt ? (
          <CardRevoked
            cert={{
              ...cert,
              revokedAt: cert.revokedAt,
            }}
          />
        ) : (
          <CardValid cert={cert} />
        )}

        <div className="mt-[var(--space-xl)] text-center">
          <Link
            href="/programs"
            className="font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"
          >
            Découvrir les programmes {brand.name} →
          </Link>
        </div>
      </main>
    </div>
  );
}

// ─── Cards ───

function CardValid({
  cert,
}: {
  cert: {
    code: string;
    recipientName: string;
    programTitle: string;
    completedAt: Date;
    issuedAt: Date;
  };
}) {
  return (
    <article className="rounded-[var(--r-l)] border border-[color:var(--accent-edge)] bg-[color:var(--surface-1)] p-[clamp(24px,4vw,40px)]">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
        >
          ✓
        </span>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[color:var(--accent-edge)]">
            Certificat valide
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-[clamp(1.4rem,2.8vw,1.8rem)] font-bold tracking-tight text-[color:var(--text-primary)]">
            Délivré par {brand.name}
          </h1>
        </div>
      </div>

      <dl className="mt-[var(--space-lg)] grid gap-[var(--space-md)] sm:grid-cols-2">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)]">
            Apprenant·e
          </dt>
          <dd className="mt-1 text-[1rem] font-semibold text-[color:var(--text-primary)]">
            {cert.recipientName}
          </dd>
        </div>

        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)]">
            Programme
          </dt>
          <dd className="mt-1 text-[1rem] font-semibold text-[color:var(--text-primary)]">
            {cert.programTitle}
          </dd>
        </div>

        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)]">
            Date de complétion
          </dt>
          <dd className="mt-1 text-[1rem] text-[color:var(--text-primary)]">
            {formatFrDate(cert.completedAt)}
          </dd>
        </div>

        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)]">
            Code de vérification
          </dt>
          <dd className="mt-1 font-mono text-[0.92rem] tracking-wider text-[color:var(--text-primary)]">
            {cert.code}
          </dd>
        </div>
      </dl>

      <p className="mt-[var(--space-lg)] border-t border-[color:var(--border-subtle)] pt-[var(--space-md)] text-[0.85rem] leading-[1.5] text-[color:var(--text-secondary)]">
        Ce certificat a été délivré le {formatFrDate(cert.issuedAt)} suite à la
        complétion du programme par l&apos;apprenant·e nommé·e ci-dessus.
      </p>
    </article>
  );
}

function CardRevoked({
  cert,
}: {
  cert: {
    code: string;
    programTitle: string;
    revokedAt: Date;
  };
}) {
  return (
    <article className="rounded-[var(--r-l)] border border-[color:var(--signal-warning,#F59E0B)] bg-[color:var(--surface-1)] p-[clamp(24px,4vw,40px)]">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--signal-warning,#F59E0B)] text-lg text-white"
        >
          ⚠
        </span>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[color:var(--signal-warning,#F59E0B)]">
            Certificat révoqué
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-[clamp(1.4rem,2.8vw,1.8rem)] font-bold tracking-tight text-[color:var(--text-primary)]">
            Ce certificat n&apos;est plus valide
          </h1>
        </div>
      </div>

      <p className="mt-[var(--space-md)] text-[0.95rem] leading-[1.5] text-[color:var(--text-secondary)]">
        Ce certificat a été révoqué le {formatFrDate(cert.revokedAt)}. Il ne
        peut plus être utilisé comme preuve de complétion. Pour toute question,
        contacte directement l&apos;équipe {brand.name}.
      </p>

      <p className="mt-[var(--space-md)] font-mono text-[0.85rem] text-[color:var(--text-tertiary)]">
        Code : {cert.code} · Programme : {cert.programTitle}
      </p>
    </article>
  );
}

function CardInvalid({ code }: { code: string }) {
  return (
    <article className="rounded-[var(--r-l)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-[clamp(24px,4vw,40px)]">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--surface-2)] text-lg text-[color:var(--text-tertiary)]"
        >
          ✗
        </span>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
            Aucun certificat trouvé
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-[clamp(1.4rem,2.8vw,1.8rem)] font-bold tracking-tight text-[color:var(--text-primary)]">
            Code inconnu
          </h1>
        </div>
      </div>

      <p className="mt-[var(--space-md)] text-[0.95rem] leading-[1.5] text-[color:var(--text-secondary)]">
        Aucun certificat ne correspond au code{' '}
        <span className="font-mono text-[0.92rem] text-[color:var(--text-primary)]">
          {code}
        </span>
        . Vérifie l&apos;orthographe (les codes sont en majuscules avec tirets,
        ex: <span className="font-mono">IMP-A1B2C3-D4E5</span>) ou contacte
        directement la personne qui t&apos;a partagé ce certificat.
      </p>
    </article>
  );
}
