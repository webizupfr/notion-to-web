import Link from 'next/link';
import { Heading } from '@/components/ui/Heading';
import { Text } from '@/components/ui/Text';

/**
 * Écran affiché quand un user arrive sur une unit verrouillée (drip pas encore ouvert).
 *
 * Pas un 404 : on garde un message positif "reviens bientôt" avec la date de déblocage
 * pour ne pas décourager l'user.
 */
type Props = {
  unitLabel: string; // "Jour", "Module", "Session"
  unitOrder: number;
  unitTitle: string;
  programSlug: string;
  programTitle: string;
  unlockDateIso: string | null;
};

function hasTimeComponent(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(iso.trim());
}

function formatFrDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const options: Intl.DateTimeFormatOptions = hasTimeComponent(iso)
    ? {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Europe/Paris',
      }
    : {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/Paris',
      };
  return d.toLocaleString('fr-FR', options);
}

function dayKeyParis(d: Date): string {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Calcule le nombre de jours civils (Europe/Paris) entre aujourd'hui et la date cible.
 * Retourne 0 si c'est aujourd'hui, négatif si dans le passé.
 */
function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso);
  if (!isFinite(target.getTime())) return null;
  const todayKey = dayKeyParis(new Date());
  const targetKey = dayKeyParis(target);
  // Calcul de la diff en jours via UTC pour éviter les pièges DST
  const [ty, tm, td] = todayKey.split('-').map(Number);
  const [yy, ym, yd] = targetKey.split('-').map(Number);
  const todayUtc = Date.UTC(ty, tm - 1, td);
  const targetUtc = Date.UTC(yy, ym - 1, yd);
  return Math.round((targetUtc - todayUtc) / (24 * 60 * 60 * 1000));
}

export function LockedUnitScreen({
  unitLabel,
  unitOrder,
  unitTitle,
  programSlug,
  programTitle,
  unlockDateIso,
}: Props) {
  const fmtDate = formatFrDate(unlockDateIso);
  const inDays = daysUntil(unlockDateIso);

  return (
    <div className="mx-auto flex max-w-[640px] flex-col items-center gap-[var(--space-md)] rounded-[var(--r-xl)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] px-[var(--space-lg)] py-[var(--space-2xl)] text-center">
      <div
        aria-hidden
        className="flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--surface-2)] text-3xl"
      >
        🔒
      </div>

      <span className="eyebrow-pill">
        <span className="eyebrow-pill__dot" aria-hidden />
        {unitLabel} {String(unitOrder).padStart(2, '0')} · Pas encore disponible
      </span>

      <Heading level={1} className="max-w-[24ch]">
        {unitTitle}
      </Heading>

      <Text variant="lead" className="max-w-[52ch] text-[color:var(--text-secondary)]">
        {fmtDate ? (
          <>
            Ce {unitLabel.toLowerCase()} sera débloqué le{' '}
            <strong className="text-[color:var(--text-primary)]">{fmtDate}</strong>
            {inDays !== null && inDays > 1 ? (
              <>
                {' '}
                — dans {inDays} jours.
              </>
            ) : inDays === 1 ? (
              <> — demain.</>
            ) : (
              '.'
            )}
          </>
        ) : (
          <>Ce {unitLabel.toLowerCase()} sera débloqué prochainement.</>
        )}
      </Text>

      <Text className="max-w-[48ch] text-[0.9rem] text-[color:var(--text-tertiary)]">
        Chaque {unitLabel.toLowerCase()} arrive au bon moment pour que tu avances à ton rythme,
        sans surcharge.
      </Text>

      <Link
        href={`/programs/${programSlug}`}
        className="btn btn-primary mt-[var(--space-sm)]"
      >
        ← Retour à {programTitle}
      </Link>
    </div>
  );
}
