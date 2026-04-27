import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

type LearningHeaderProps = {
  unitLabel?: string;
  unitNumber?: number | null;
  title: string;
  summary?: string | null;
  currentStep?: number | null;
  totalSteps?: number | null;
  /** Si true, affiche un badge "Terminé" et la barre à 100% au lieu de la progression step-wizard. */
  completed?: boolean;
};

export function LearningHeader({
  unitLabel = "Jour",
  unitNumber = null,
  title,
  summary,
  currentStep,
  totalSteps,
  completed = false,
}: LearningHeaderProps) {
  const showProgress = totalSteps !== null && totalSteps !== undefined && (totalSteps ?? 0) > 1;
  const stepProgress = showProgress
    ? Math.min(Math.max((Number(currentStep ?? 1) / Number(totalSteps ?? 1)) * 100, 0), 100)
    : 0;
  // Si la unit est terminée, on force 100% peu importe le stepIdx (l'user peut être
  // en train de relire le step 1, mais il a déjà tout complété).
  const progress = completed ? 100 : stepProgress;
  const stepNumber = Math.min(Number(currentStep ?? 1), Number(totalSteps ?? 1));

  return (
    <header className="w-full space-y-[var(--space-md)] pb-[var(--space-lg)] border-b border-[color:var(--border-subtle)]">
      <div className="flex items-center gap-2">
        {unitNumber !== null && unitNumber !== undefined ? (
          <span className="eyebrow-pill">
            <span className="eyebrow-pill__dot" aria-hidden />
            {unitLabel} {String(unitNumber).padStart(2, "0")}
          </span>
        ) : null}
        {completed ? (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-[color:var(--signal-success)] bg-[color-mix(in_oklab,var(--signal-success)_14%,transparent)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--signal-success)]"
          >
            ✓ Terminé
          </span>
        ) : null}
      </div>

      <Heading level={1}>{title}</Heading>

      {summary ? (
        <Text variant="lead" className="max-w-[62ch] text-[color:var(--text-secondary)]">
          {summary}
        </Text>
      ) : null}

      {showProgress ? (
        <div className="space-y-[var(--space-xs)] pt-[var(--space-xs)]">
          <div className="meta-row">
            <span>
              {completed
                ? `${totalSteps} étapes terminées`
                : `Étape ${String(stepNumber).padStart(2, "0")} / ${String(totalSteps).padStart(2, "0")}`}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="progress-bar__fill"
              style={{
                width: `${progress}%`,
                ...(completed ? { background: 'var(--signal-success)' } : {}),
              }}
            />
          </div>
        </div>
      ) : null}
    </header>
  );
}
