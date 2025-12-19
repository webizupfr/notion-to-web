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

function pickTodayDay(days: DayEntry[]): { day: DayEntry; locked: boolean } | null {
  if (!days.length) return null;
  const nowKey = getNowDateKeyParis();
  const nowNum = toKeyNum(nowKey)!;

  const withKeys = days
    .map((d) => ({ d, key: toKeyNum(dateKeyFromIso(d.unlockDate ?? '')) }))
    .sort((a, b) => (a.key ?? 0) - (b.key ?? 0) || a.d.order - b.d.order);

  // If at least one has a valid unlockDate, use date-based availability
  const anyDated = withKeys.some((x) => x.key !== null);
  if (anyDated) {
    const available = withKeys.filter((x) => x.key !== null && (x.key as number) <= nowNum);
    if (available.length > 0) {
      const last = available[available.length - 1].d;
      return { day: last, locked: false };
    }
    // No available yet → pick earliest upcoming
    const upcoming = withKeys.find((x) => x.key !== null && (x.key as number) > nowNum);
    if (upcoming) return { day: upcoming.d, locked: true };
  }

  // Fallbacks: use state if present, otherwise last of list
  const opened = days.filter((d) => !d.state || !/verrou/i.test(d.state));
  if (opened.length) return { day: opened[opened.length - 1], locked: false };

  // If everything is locked or no metadata, return the last day
  return { day: days[days.length - 1], locked: /verrou/i.test(days[days.length - 1].state ?? '') };
}

type StartTodayProps = {
  days: DayEntry[];
  unitLabelSingular?: string | null;
  basePathPrefix?: string | null;
};

export default async function StartToday({ days, unitLabelSingular, basePathPrefix = null }: StartTodayProps) {
  const pick = pickTodayDay(days);
  if (!pick) return null;

  const { day, locked } = pick;
  const unitLabel = unitLabelSingular?.trim() || 'Jour';

  // Subtitle: locked → show availability date if known
  let subtitle: string | null = null;
  if (locked && day.unlockDate) {
    const parsed = dateKeyFromIso(day.unlockDate);
    if (parsed) {
      const [y, m, d] = parsed.split('-').map((x) => Number(x));
      const dt = new Date(Date.UTC(y, (m - 1), d, 0, 0, 0));
      subtitle = `Disponible le ${formatFrDate(dt)}`;
    }
  }
  if (!subtitle) subtitle = locked ? 'Bientôt disponible' : 'Prêt ?';

  const prefix = basePathPrefix ? `/${basePathPrefix.replace(/^\/|\/$/g, '')}` : '';
  const href = `${prefix}/${day.slug}`.replace(/\/+/g, '/');

  return (
    <div className="rounded-2xl p-6 md:p-8 bg-amber-50 border border-amber-200 shadow-sm">
      <Text variant="small" className="text-amber-700 mb-2 uppercase tracking-wide">Aujourd’hui</Text>
      <Heading level={2} className="text-[1.8rem] md:text-[2.1rem] leading-[1.2] mb-2">🎯 {unitLabel} {day.order} : {day.title}</Heading>
      <Text className="text-slate-700 mb-5">{subtitle}</Text>

      {locked ? (
        <button
          disabled
          className="btn btn-disabled opacity-60 cursor-not-allowed"
          aria-disabled="true"
          title="Bientôt disponible"
        >
          ⏳ Bientôt disponible
        </button>
      ) : (
        <Link href={href} className="btn btn-primary inline-flex items-center gap-2">
          ⚡ Démarrer l’activité du jour
        </Link>
      )}
    </div>
  );
}
