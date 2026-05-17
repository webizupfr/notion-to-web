"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type CompletionProps = {
  programType: 'async' | 'sync' | 'event';
  programSlug: string;
  cohortSlug?: string | null;
  /** notionId de l'unit (pas du step) — c'est l'unit qui est marquée terminée. */
  unitNotionId: string;
  /** slug de l'unit (pour persistance côté DB). */
  unitSlug?: string;
  /** Où rediriger après complétion (défaut: /programs/[slug]). */
  returnTo: string;
  /** Si déjà complétée, on rend un état "terminé" non-cliquable. */
  alreadyCompleted?: boolean;
  label?: string;
  labelCompleted?: string;
};

export function StepNavBar({
  basePath,
  currentIndex,
  total,
  currentStepId,
  completion,
}: {
  basePath: string;
  currentIndex: number;
  total: number;
  currentStepId: string;
  /** Infos pour marquer la unit comme terminée quand on est sur le dernier step. */
  completion?: CompletionProps;
}) {
  const router = useRouter();
  const storageKey = useMemo(() => `sprint_progress::${basePath}`, [basePath]);
  const [completed, setCompleted] = useState(completion?.alreadyCompleted ?? false);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const prevHref = currentIndex - 1 <= 0 ? `${basePath}#steps` : `${basePath}?step=${currentIndex}#steps`;
  const nextHref = `${basePath}?step=${currentIndex + 2}#steps`;

  const markSeenLocal = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      map[currentStepId] = true;
      localStorage.setItem(storageKey, JSON.stringify(map));
    } catch { /* ignore */ }
  };

  const onPrev = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    router.push(prevHref);
  };

  const onNext = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    markSeenLocal();
    router.push(nextHref);
  };

  const onComplete = () => {
    if (!completion || completed || busy) return;
    setError(null);
    setCompleted(true); // optimistic
    markSeenLocal();
    startTransition(async () => {
      try {
        const res = await fetch('/api/progress/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            programType: completion.programType,
            programSlug: completion.programSlug,
            cohortSlug: completion.cohortSlug ?? null,
            activityNotionId: completion.unitNotionId,
            activitySlug: completion.unitSlug ?? null,
          }),
        });
        if (!res.ok) throw new Error('server_error');
        // Redirection avec feedback success + hint optimiste pour la home.
        const params = new URLSearchParams({ done: '1' });
        if (completion.unitSlug) params.set('completed', completion.unitSlug);
        router.push(`${completion.returnTo}?${params.toString()}`);
      } catch (e) {
        setCompleted(false); // rollback
        setError(e instanceof Error ? e.message : 'Erreur');
      }
    });
  };

  const showNext = currentIndex < total - 1;
  const showPrev = currentIndex > 0;
  const isLastStep = currentIndex >= total - 1;

  const completeLabel = completion?.label ?? 'Terminer';
  const completeLabelDone = completion?.labelCompleted ?? 'Terminé ✓';

  return (
    <div className="step-nav-bar">
      <div className="step-nav-bar__inner">
        <span className="mr-auto font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
          Étape {String(currentIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
        {showPrev ? (
          <a href={prevHref} onClick={onPrev} className="btn btn-secondary">
            ← Précédent
          </a>
        ) : null}
        {showNext ? (
          <a href={nextHref} onClick={onNext} className="btn btn-primary">
            Suivant →
          </a>
        ) : completion ? (
          <button
            type="button"
            onClick={onComplete}
            disabled={completed || busy}
            className={completed ? 'btn btn-success' : 'btn btn-primary'}
            aria-pressed={completed}
          >
            {completed ? completeLabelDone : busy ? 'En cours…' : completeLabel}
          </button>
        ) : null}
        {isLastStep && error ? (
          <span role="alert" className="font-mono text-[10px] uppercase text-[color:var(--signal-danger)]">
            Échec : {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}
