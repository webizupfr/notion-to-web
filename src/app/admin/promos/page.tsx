import { requireAdmin } from '@/lib/admin/guard';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import type Stripe from 'stripe';

/**
 * Liste des codes promo Stripe (lecture seule).
 *
 * On ne crée pas les codes ici — ça se fait dans Stripe Dashboard
 * → Products → Coupons → Create. Cette page sert juste à les voir
 * sans avoir à se logger sur Stripe.
 *
 * Pour créer un code :
 *   1. Stripe Dashboard → Coupons → New
 *   2. Type (% off ou fixed amount), durée (once/forever/repeating)
 *   3. Promotion code → générer avec un code lisible (ex: LAUNCH20)
 *   4. Le code apparaît ici après refresh
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PromoView = {
  id: string;
  code: string;
  active: boolean;
  couponId: string;
  couponName: string | null;
  /** "20% off" ou "5,00 € off" */
  discount: string;
  duration: string;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresAt: string | null;
  createdAt: string;
};

function formatDiscount(coupon: Stripe.Coupon): string {
  if (coupon.percent_off != null) {
    return `${coupon.percent_off}% off`;
  }
  if (coupon.amount_off != null && coupon.currency) {
    const amount = (coupon.amount_off / 100).toLocaleString('fr-FR', {
      style: 'currency',
      currency: coupon.currency.toUpperCase(),
      maximumFractionDigits: coupon.amount_off % 100 === 0 ? 0 : 2,
    });
    return `${amount} off`;
  }
  return '—';
}

function formatDuration(coupon: Stripe.Coupon): string {
  if (coupon.duration === 'once') return 'Une fois';
  if (coupon.duration === 'forever') return 'Permanent';
  if (coupon.duration === 'repeating' && coupon.duration_in_months) {
    return `${coupon.duration_in_months} mois`;
  }
  return coupon.duration;
}

function formatDate(unixSec: number | null | undefined): string {
  if (!unixSec) return '—';
  return new Date(unixSec * 1000).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

async function fetchPromoCodes(): Promise<PromoView[]> {
  if (!isStripeConfigured()) return [];
  const stripe = getStripe()!;

  // Liste les promotion codes (limite 100, ce qui couvre la plupart des cas).
  // Pour scaler : pagination via starting_after.
  // Note : depuis l'API 2026-04 le coupon est sous `promotion.coupon` (pas direct sur pc).
  const codes = await stripe.promotionCodes.list({
    limit: 100,
    expand: ['data.promotion.coupon'],
  });

  return codes.data.map((pc): PromoView => {
    const coupon = pc.promotion?.coupon;
    if (!coupon || typeof coupon === 'string') {
      return {
        id: pc.id,
        code: pc.code,
        active: pc.active,
        couponId: typeof coupon === 'string' ? coupon : '—',
        couponName: null,
        discount: '—',
        duration: '—',
        timesRedeemed: pc.times_redeemed,
        maxRedemptions: pc.max_redemptions,
        expiresAt: pc.expires_at ? formatDate(pc.expires_at) : null,
        createdAt: formatDate(pc.created),
      };
    }
    return {
      id: pc.id,
      code: pc.code,
      active: pc.active,
      couponId: coupon.id,
      couponName: coupon.name,
      discount: formatDiscount(coupon),
      duration: formatDuration(coupon),
      timesRedeemed: pc.times_redeemed,
      maxRedemptions: pc.max_redemptions,
      expiresAt: pc.expires_at ? formatDate(pc.expires_at) : null,
      createdAt: formatDate(pc.created),
    };
  });
}

export default async function AdminPromosPage() {
  await requireAdmin();
  const codes = await fetchPromoCodes();

  return (
    <div className="space-y-[var(--space-xl)]">
      <section className="flex flex-col gap-[var(--space-md)] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.6rem,2.6vw,2rem)] font-bold tracking-tight text-[color:var(--text-primary)]">
            Codes promo
          </h1>
          <p className="mt-1 text-[0.9rem] text-[color:var(--text-secondary)]">
            {codes.length} code{codes.length > 1 ? 's' : ''} ·{' '}
            <a
              href="https://dashboard.stripe.com/coupons"
              target="_blank"
              rel="noopener"
              className="font-mono text-[11px] uppercase tracking-[0.08em] text-[color:var(--accent-edge)] hover:underline"
            >
              Créer dans Stripe ↗
            </a>
          </p>
        </div>
      </section>

      {codes.length === 0 ? (
        <section className="rounded-[var(--r-l)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-[var(--space-xl)] text-center">
          <h2 className="font-[family-name:var(--font-display)] text-[1.2rem] font-semibold text-[color:var(--text-primary)]">
            Aucun code promo
          </h2>
          <p className="mt-2 text-[0.95rem] text-[color:var(--text-secondary)]">
            Crée un code dans{' '}
            <a
              href="https://dashboard.stripe.com/coupons"
              target="_blank"
              rel="noopener"
              className="text-[color:var(--accent-edge)] hover:underline"
            >
              Stripe Dashboard → Coupons
            </a>
            {' '}— il apparaîtra ici après refresh.
          </p>
          <div className="mt-[var(--space-md)] text-left text-[0.85rem] text-[color:var(--text-tertiary)]">
            <p className="font-mono uppercase tracking-[0.1em]">Recettes utiles :</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li><span className="font-mono">LAUNCH20</span> — 20% off · usage unique · pour le launch</li>
              <li><span className="font-mono">BETA50</span> — 50% off · 10 redemptions max · pour les beta-testeurs</li>
              <li><span className="font-mono">FRIEND</span> — 30% off · permanent · à partager au réseau</li>
            </ul>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-[var(--r-m)] border border-[color:var(--border-subtle)]">
          <table className="w-full">
            <thead className="bg-[color:var(--surface-1)]">
              <tr>
                <Th>Code</Th>
                <Th>Réduction</Th>
                <Th>Durée</Th>
                <Th align="right">Utilisations</Th>
                <Th>Expiration</Th>
                <Th>Créé</Th>
                <Th>Statut</Th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-t border-[color:var(--border-subtle)]">
                  <Td>
                    <span className="font-mono text-[0.92rem] font-semibold text-[color:var(--text-primary)]">
                      {c.code}
                    </span>
                    {c.couponName ? (
                      <span className="ml-2 text-[11px] text-[color:var(--text-tertiary)]">
                        ({c.couponName})
                      </span>
                    ) : null}
                  </Td>
                  <Td mono>{c.discount}</Td>
                  <Td>{c.duration}</Td>
                  <Td align="right" mono>
                    {c.timesRedeemed}
                    {c.maxRedemptions ? ` / ${c.maxRedemptions}` : ''}
                  </Td>
                  <Td>{c.expiresAt ?? '—'}</Td>
                  <Td>{c.createdAt}</Td>
                  <Td>
                    <StatusBadge active={c.active} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className="inline-flex rounded-[var(--r-xs)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]"
      style={{
        background: active ? 'var(--signal-success-bg)' : 'var(--surface-2)',
        color: active ? 'var(--signal-success)' : 'var(--text-tertiary)',
      }}
    >
      {active ? 'Actif' : 'Inactif'}
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
      className={`px-3 py-2.5 text-[0.9rem] text-[color:var(--text-primary)] ${
        mono ? 'font-mono' : ''
      }`}
      style={{ textAlign: align }}
    >
      {children}
    </td>
  );
}
