"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  programType: 'async' | 'sync' | 'event';
  programSlug: string;
  cohortSlug?: string | null;
  activityNotionId: string;
  activitySlug?: string | null;
  /** true si déjà complétée → affiche ✓ terminé */
  alreadyCompleted?: boolean;
  label?: string;
  labelCompleted?: string;
  className?: string;
};

/**
 * Checkbox-like button pour marquer une activité/jour comme complété.
 * Optimistic UI : met à jour localement avant que la requête API revienne.
 */
export function CompleteActivityButton({
  programType,
  programSlug,
  cohortSlug = null,
  activityNotionId,
  activitySlug = null,
  alreadyCompleted = false,
  label = "Marquer terminé",
  labelCompleted = "Terminé ✓",
  className = 'btn btn-secondary',
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [completed, setCompleted] = useState(alreadyCompleted);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (completed || isPending) return;
    setError(null);
    // Optimistic
    setCompleted(true);

    startTransition(async () => {
      try {
        const res = await fetch('/api/progress/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            programType,
            programSlug,
            cohortSlug,
            activityNotionId,
            activitySlug,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? 'server_error');
        }
        router.refresh();
      } catch (e) {
        // Rollback
        setCompleted(false);
        setError(e instanceof Error ? e.message : 'Erreur');
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className={className}
        onClick={handleClick}
        disabled={completed || isPending}
        aria-pressed={completed}
      >
        {completed ? labelCompleted : isPending ? 'En cours…' : label}
      </button>
      {error && (
        <p role="alert" className="text-[0.75rem] text-[color:var(--signal-danger)]">
          Échec : {error}
        </p>
      )}
    </div>
  );
}
