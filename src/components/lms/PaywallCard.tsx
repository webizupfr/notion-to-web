import { IconCheck, IconLock, IconAward } from '@/components/ui/icons';
import { EnrollButton } from '@/components/lms/EnrollButton';
import type { InstructorMeta } from '@/lib/types';

/**
 * Card paywall pro affichée sur la page détail d'un programme PAYANT
 * pour les users non-acheteurs.
 *
 * Layout (mobile + desktop) :
 *   ┌──────────────────────────────────┐
 *   │ 🔒 PROGRAMME PREMIUM             │
 *   │ 49,00 €                          │
 *   │ ──────────                       │
 *   │ ✓ Accès à vie                    │
 *   │ ✓ Certificat délivré             │
 *   │ ✓ N jours · à ton rythme         │
 *   │ ──────────                       │
 *   │ Avec :                           │
 *   │ [Avatar] Nom Instructor          │
 *   │ ──────────                       │
 *   │ [    Débloquer pour 49 €    ]    │
 *   └──────────────────────────────────┘
 */

type Props = {
  programType: 'async' | 'sync' | 'event';
  programSlug: string;
  price: number;
  currency: string;
  unitsCount: number;
  unitLabelPlural: string;
  certificateEnabled?: boolean | null;
  instructors: InstructorMeta[];
  requireLogin: boolean;
};

function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function PaywallCard({
  programType,
  programSlug,
  price,
  currency,
  unitsCount,
  unitLabelPlural,
  certificateEnabled,
  instructors,
  requireLogin,
}: Props) {
  const priceLabel = formatPrice(price, currency);

  const features = [
    {
      icon: IconCheck,
      label: 'Accès à vie au programme',
    },
    {
      icon: IconCheck,
      label: `${unitsCount} ${unitLabelPlural.toLowerCase()} · à ton rythme`,
    },
    ...(certificateEnabled
      ? [{ icon: IconAward, label: 'Certificat de complétion' }]
      : []),
    {
      icon: IconCheck,
      label: 'Paiement sécurisé via Stripe',
    },
  ];

  return (
    <aside
      className="overflow-hidden rounded-[var(--r-l)] border-2 border-[color:var(--accent)] bg-[color:var(--surface-1)] shadow-[var(--shadow-l)]"
      aria-labelledby="paywall-card-title"
    >
      {/* Header avec accent */}
      <header className="flex items-center gap-2 border-b border-[color:var(--border-subtle)] bg-[color:var(--accent-bg)] px-[var(--space-lg)] py-[var(--space-sm)]">
        <IconLock size={14} className="text-[color:var(--accent-edge)]" aria-hidden strokeWidth={2.5} />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--accent-edge)]">
          Programme premium
        </span>
      </header>

      {/* Prix */}
      <div className="px-[var(--space-lg)] pt-[var(--space-lg)]">
        <h3
          id="paywall-card-title"
          className="font-[family-name:var(--font-display)] text-[clamp(2rem,3.5vw,2.5rem)] leading-[1] tracking-[-0.03em] font-bold text-[color:var(--text-primary)]"
        >
          {priceLabel}
        </h3>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)]">
          Paiement unique
        </p>
      </div>

      {/* Features */}
      <ul className="space-y-[var(--space-xs)] border-b border-[color:var(--border-subtle)] px-[var(--space-lg)] py-[var(--space-md)]">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <li key={i} className="flex items-start gap-2 text-[0.95rem] text-[color:var(--text-primary)]">
              <Icon size={16} className="mt-[3px] shrink-0 text-[color:var(--signal-success)]" aria-hidden />
              <span>{f.label}</span>
            </li>
          );
        })}
      </ul>

      {/* Instructeurs */}
      {instructors.length > 0 ? (
        <div className="border-b border-[color:var(--border-subtle)] px-[var(--space-lg)] py-[var(--space-md)]">
          <p className="mb-[var(--space-xs)] font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
            Animé par
          </p>
          <div className="flex flex-wrap items-center gap-[var(--space-sm)]">
            {instructors.map((instr) => (
              <div key={instr.id} className="flex items-center gap-2">
                {instr.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={instr.photoUrl}
                    alt={instr.name}
                    className="h-8 w-8 rounded-full border border-[color:var(--border-subtle)] object-cover"
                  />
                ) : (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-2)] font-mono text-[12px] text-[color:var(--text-tertiary)]">
                    {instr.name?.[0] ?? '?'}
                  </span>
                )}
                <span className="text-[0.92rem] font-medium text-[color:var(--text-primary)]">
                  {instr.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* CTA */}
      <div className="px-[var(--space-lg)] py-[var(--space-md)]">
        <EnrollButton
          programType={programType}
          programSlug={programSlug}
          alreadyEnrolled={false}
          requireLogin={requireLogin}
          nextHref={`/programs/${programSlug}`}
          price={price}
          currency={currency}
          labelEnroll={`Débloquer pour ${priceLabel}`}
          className="btn btn-primary w-full"
        />
        <p className="mt-[var(--space-xs)] text-center font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)]">
          Paiement sécurisé · Stripe
        </p>
      </div>
    </aside>
  );
}
