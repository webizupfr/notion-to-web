import 'server-only';

import Link from 'next/link';
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import type { DayEntry } from '@/lib/types';

function formatFrDate(d: Date) {
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  });
}

function hasTimeComponent(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(iso.trim());
}

function formatUnlockDate(iso: string): string | null {
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return null;
  if (!hasTimeComponent(iso)) return formatFrDate(d);
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Paris',
  });
}

function getNowDateKeyParis(): string {
  // Build a YYYY-MM-DD string for Europe/Paris current date to compare to Notion dates safely
  const now = new Date();
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    }, {});
  const y = parts.year;
  const m = parts.month;
  const d = parts.day;
  return `${y}-${m}-${d}`;
}

function dateKeyFromIso(iso: string): string | null {
  if (!iso) return null;
  const datePart = iso.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
  return null;
}

function toKeyNum(key: string | null): number | null {
  if (!key) return null;
  return Number(key.replace(/-/g, ''));
}

type PickResult =
  | { kind: 'available'; day: DayEntry; locked: false }
  | { kind: 'locked'; day: DayEntry; locked: true }
  | { kind: 'all-done' };

/**
 * Choisit quel jour afficher dans "Prochaine activité".
 *
 * Priorités :
 *   1. Premier jour/module non-complété dans l'ordre du programme
 *   2. S'il est verrouillé, on l'affiche quand même comme prochaine étape
 *   3. Si tout terminé → 'all-done'
 */
function pickTodayDay(days: DayEntry[]): PickResult | null {
  if (!days.length) return null;
  const sorted = [...days].sort((a, b) => a.order - b.order);

  const nowKey = getNowDateKeyParis();
  const nowNum = toKeyNum(nowKey)!;
  const isUnlocked = (d: DayEntry): boolean => {
    // Verrou via state explicite
    if (d.state && /verrou/i.test(d.state)) return false;
    // Verrou via unlockDate future
    const key = toKeyNum(dateKeyFromIso(d.unlockDate ?? ''));
    if (key !== null && key > nowNum) return false;
    return true;
  };

  const firstNotDone = sorted.find((d) => !d.completed);
  if (firstNotDone) {
    const unlocked = isUnlocked(firstNotDone);
    return unlocked
      ? { kind: 'available', day: firstNotDone, locked: false }
      : { kind: 'locked', day: firstNotDone, locked: true };
  }

  return { kind: 'all-done' };
}

type StartTodayProps = {
  days: DayEntry[];
  unitLabelSingular?: string | null;
  basePathPrefix?: string | null;
};

export default async function StartToday({ days, unitLabelSingular, basePathPrefix = null }: StartTodayProps) {
  const pick = pickTodayDay(days);
  if (!pick) return null;
  const unitLabel = unitLabelSingular?.trim() || 'Jour';

  // Cas "tout terminé" — félicitations, pas de CTA d'activité
  if (pick.kind === 'all-done') {
    return (
      <div
        className="rounded-[var(--r-l)] border border-[color:var(--signal-success)] bg-[color:var(--surface-1)] p-[clamp(20px,2.4vw,28px)]"
        style={{
          backgroundImage:
            "radial-gradient(520px 220px at 90% -10%, color-mix(in oklab, var(--signal-success) 20%, transparent) 0%, transparent 60%)",
        }}
      >
        <span className="eyebrow-pill">
          <span className="eyebrow-pill__dot" aria-hidden />
          Programme terminé
        </span>
        <Heading
          level={2}
          className="mt-[var(--space-sm)] text-[clamp(1.4rem,2.6vw,2rem)] leading-[1.15] tracking-[-0.028em]"
        >
          Félicitations, tu as tout complété 🎉
        </Heading>
        <Text className="mt-[var(--space-xs)] max-w-[52ch] text-[color:var(--text-secondary)]">
          Tu as parcouru toutes les activités. Tu peux les relire autant que tu veux depuis la sidebar.
        </Text>
      </div>
    );
  }

  const { day, locked } = pick;

  // Subtitle: locked → show availability date if known
  let subtitle: string | null = null;
  if (locked && day.unlockDate) {
    const formatted = formatUnlockDate(day.unlockDate);
    if (formatted) subtitle = `Disponible le ${formatted}`;
  }
  if (!subtitle) subtitle = locked ? 'Bientôt disponible' : 'Prêt ?';

  const prefix = basePathPrefix ? `/${basePathPrefix.replace(/^\/|\/$/g, '')}` : '';
  const href = `${prefix}/${day.slug}`.replace(/\/+/g, '/');

  return (
    <div
      className="rounded-[var(--r-l)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-[clamp(20px,2.4vw,28px)]"
      style={{
        backgroundImage:
          "radial-gradient(520px 220px at 90% -10%, var(--accent-bg) 0%, transparent 60%)",
      }}
    >
      <span className="eyebrow-pill">
        <span className="eyebrow-pill__dot" aria-hidden />
        Aujourd&apos;hui · Prochaine activité
      </span>
      <Heading
        level={2}
        className="mt-[var(--space-sm)] text-[clamp(1.4rem,2.6vw,2rem)] leading-[1.15] tracking-[-0.028em]"
      >
        {unitLabel} {String(day.order).padStart(2, "0")} — {day.title}
      </Heading>
      <Text className="mt-[var(--space-xs)] max-w-[52ch] text-[color:var(--text-secondary)]">
        {subtitle}
      </Text>

      <div className="mt-[var(--space-lg)]">
        {locked ? (
          <button
            disabled
            className="btn btn-secondary opacity-60 cursor-not-allowed"
            aria-disabled="true"
            title="Bientôt disponible"
          >
            Bientôt disponible
          </button>
        ) : (
          <Link href={href} className="btn btn-primary">
            Démarrer l&apos;activité →
          </Link>
        )}
      </div>
    </div>
  );
}
