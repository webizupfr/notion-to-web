import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

type LearningHeaderProps = {
  unitLabel?: string;
  unitNumber?: number | null;
  title: string;
  summary?: string | null;
  currentStep?: number | null;
  totalSteps?: number | null;
};

export function LearningHeader({
  unitLabel = "Jour",
  unitNumber = null,
  title,
  summary,
  currentStep,
  totalSteps,
}: LearningHeaderProps) {
  const showProgress = totalSteps !== null && totalSteps !== undefined && (totalSteps ?? 0) > 1;
  const progress = showProgress
    ? Math.min(Math.max((Number(currentStep ?? 1) / Number(totalSteps ?? 1)) * 100, 0), 100)
    : 0;

  return (
    <div className="surface-card w-full space-y-[var(--space-s)]">
      <div className="flex items-start justify-between gap-[var(--space-s)]">
        <div className="space-y-[var(--space-xs)]">
          {unitNumber !== null && unitNumber !== undefined ? (
            <Text variant="small" className="uppercase tracking-[0.16em] text-[color:var(--muted)]">
              {unitLabel} {unitNumber}
            </Text>
          ) : null}
          <Heading level={1}>{title}</Heading>
          {summary ? (
            <Text className="max-w-[72ch] text-[color:var(--fg-muted)]">{summary}</Text>
          ) : null}
        </div>
        {unitNumber !== null && unitNumber !== undefined ? (
          <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color-mix(in_srgb,var(--bg)_96%,white_4%)] px-[var(--space-4)] py-[var(--space-2)] text-[0.95rem] font-semibold text-[color:var(--fg)] shadow-[var(--shadow-subtle)]">
            <span>{unitNumber}</span>
            <span className="uppercase tracking-[0.16em] text-[color:var(--muted)]">{unitLabel}</span>
          </div>
        ) : null}
      </div>

      {showProgress ? (
        <div className="pt-[2px]">
          <Text variant="small" className="mb-1 font-medium uppercase tracking-[0.12em] text-[color:var(--fg-muted)]">
            Étape {Math.min(Number(currentStep ?? 1), Number(totalSteps ?? 1))} / {totalSteps}
          </Text>
          <div className="h-1.5 w-full rounded-full bg-[color-mix(in_srgb,var(--bg-soft)_85%,white_15%)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-amber-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
