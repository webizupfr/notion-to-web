import Link from 'next/link';

import type { RangeKey } from '@/lib/admin/analytics';

/**
 * Filtre date range (server component) — mutate les query params.
 *
 * Pas de JS côté client : on génère juste 5 liens qui ajoutent ?range=... à
 * l'URL. La page server-side re-fetch les data avec la nouvelle range.
 */

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: '7d', label: '7 jours' },
  { key: '30d', label: '30 jours' },
  { key: '90d', label: '90 jours' },
  { key: '12m', label: '12 mois' },
  { key: 'all', label: 'Tout' },
];

export function DateRangeFilter({
  current,
  basePath,
}: {
  current: RangeKey;
  basePath: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-[color:var(--border-subtle)] pb-2">
      <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
        Période :
      </span>
      {RANGES.map((r) => {
        const href = r.key === '30d' ? basePath : `${basePath}?range=${r.key}`;
        const isActive = current === r.key;
        return (
          <Link
            key={r.key}
            href={href}
            className={`rounded-[var(--r-xs)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors ${
              isActive
                ? 'bg-[color:var(--accent-bg)] text-[color:var(--accent-edge)]'
                : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-1)] hover:text-[color:var(--text-primary)]'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {r.label}
          </Link>
        );
      })}
    </div>
  );
}
