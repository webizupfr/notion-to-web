/**
 * Barre de progression sobre. Utilisée sur /programs/[slug] et /my-learning.
 *
 * @param completed nombre d'unités terminées
 * @param total     total d'unités
 * @param label     optionnel : override du label par défaut ("N/M unités")
 * @param unitLabelPlural  pluriel de l'unité (Jours, Modules, Sessions)
 */
export function ProgressBar({
  completed,
  total,
  label,
  unitLabelPlural = 'unités',
  compact = false,
}: {
  completed: number;
  total: number;
  label?: string;
  unitLabelPlural?: string;
  compact?: boolean;
}) {
  const safeTotal = Math.max(0, total);
  const safeCompleted = Math.max(0, Math.min(safeTotal, completed));
  const pct = safeTotal > 0 ? Math.round((safeCompleted / safeTotal) * 100) : 0;
  const derivedLabel = label ?? `${safeCompleted}/${safeTotal} ${unitLabelPlural.toLowerCase()}`;

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`font-mono uppercase tracking-[0.1em] text-[color:var(--text-tertiary)] ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
          {derivedLabel}
        </span>
        <span className={`font-mono text-[color:var(--text-secondary)] ${compact ? 'text-[11px]' : 'text-[12px]'}`}>
          {pct}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-[6px] w-full overflow-hidden rounded-full bg-[color:var(--surface-2)]"
      >
        <div
          className="h-full rounded-full bg-[color:var(--accent)] transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
