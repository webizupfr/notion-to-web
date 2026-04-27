"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  programType: 'async' | 'sync' | 'event';
  programSlug: string;
  cohortSlug?: string | null;
  /** Programme déjà acheté (purchases) ou enrollé (programmes gratuits) */
  alreadyEnrolled?: boolean;
  /** Pas connecté → redirige vers /login au clic */
  requireLogin?: boolean;
  /** ?next=... après login */
  nextHref?: string;
  /**
   * Prix du programme. Si > 0 → le bouton passe en mode "Acheter pour X€"
   * et déclenche un Stripe Checkout au lieu d'un enrollment direct.
   */
  price?: number | null;
  currency?: string | null;
  labelEnroll?: string;
  labelEnrolled?: string;
  className?: string;
};

function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency || 'EUR'}`;
  }
}

export function EnrollButton({
  programType,
  programSlug,
  cohortSlug = null,
  alreadyEnrolled = false,
  requireLogin = false,
  nextHref,
  price = null,
  currency = 'EUR',
  labelEnroll = "Rejoindre le programme",
  labelEnrolled = "Inscrit ✓",
  className = 'btn btn-primary',
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [enrolled, setEnrolled] = useState(alreadyEnrolled);
  const [error, setError] = useState<string | null>(null);

  const isPaid = typeof price === 'number' && price > 0;
  const priceLabel = isPaid ? formatPrice(price, currency || 'EUR') : null;

  // Déjà inscrit / acheté
  if (enrolled) {
    return (
      <button type="button" className={className} style={{ height: 44 }} disabled>
        {labelEnrolled}
      </button>
    );
  }

  // Pas connecté → redirect /login (preserve next pour reprendre où il en était)
  if (requireLogin) {
    const href = `/login?next=${encodeURIComponent(nextHref ?? '/my-learning')}`;
    return (
      <a href={href} className={className} style={{ height: 44 }}>
        {isPaid ? `Acheter pour ${priceLabel}` : labelEnroll}
      </a>
    );
  }

  async function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        if (isPaid) {
          // Stripe Checkout
          const res = await fetch('/api/checkout/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ programSlug }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? 'checkout_error');
          if (data.alreadyOwned) {
            setEnrolled(true);
            router.refresh();
            return;
          }
          if (data.url) {
            window.location.href = data.url;
            return;
          }
          throw new Error('no_checkout_url');
        }

        // Enrollment gratuit (existant)
        const res = await fetch('/api/progress/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ programType, programSlug, cohortSlug }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'server_error');
        setEnrolled(true);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur');
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className={className}
        style={{ height: 44 }}
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending
          ? isPaid
            ? 'Redirection vers Stripe…'
            : 'Inscription…'
          : isPaid
            ? `Acheter pour ${priceLabel}`
            : labelEnroll}
      </button>
      {error && (
        <p role="alert" className="text-[0.8rem] text-[color:var(--signal-danger)]">
          Échec : {error}
        </p>
      )}
    </div>
  );
}
