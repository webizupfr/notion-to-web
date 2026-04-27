import Link from 'next/link';
import type { PinnedResource } from '@/lib/types';

/**
 * Liste de ressources rendue dans la sidebar (via PageSidebar.actionsSlot).
 *
 * Comportement par type :
 *   - kind='internal' : <Link> interne vers /programs/[slug]/r/[resourceSlug]
 *   - kind='external' : <a target="_blank"> vers l'URL externe (Slack, Calendly...)
 *
 * Note : la sidebar fournit déjà le label "RESSOURCES", on ne rend ici que la
 * liste pure (pas de header répété).
 */
export function ProgramResources({
  resources,
  programSlug,
}: {
  resources: PinnedResource[];
  programSlug: string;
}) {
  if (!resources.length) return null;
  return (
    <ul className="space-y-1.5">
      {resources.map((r, idx) => {
        const internalHref =
          r.kind === 'internal' && r.slug ? `/programs/${programSlug}/r/${r.slug}` : null;
        const externalHref = r.kind === 'external' ? r.url ?? null : null;

        const linkClass =
          'block text-[0.85rem] leading-[1.35] text-[color:var(--text-secondary)] transition-colors hover:text-[color:var(--text-primary)]';

        return (
          <li key={`${r.label}-${idx}`}>
            {internalHref ? (
              <Link href={internalHref} className={linkClass}>
                {r.label}
              </Link>
            ) : externalHref ? (
              <a href={externalHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {r.label}{' '}
                <span aria-hidden className="text-[color:var(--text-tertiary)]">
                  ↗
                </span>
              </a>
            ) : (
              <span className={linkClass}>{r.label}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
