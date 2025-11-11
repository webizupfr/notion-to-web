"use client";

import { useEffect, useMemo, useState } from "react";

export function NextLink({
  baseSlug,
  nextStepHref,
  hasMoreSteps,
  nextDaySlug,
  fromActivity,
}: {
  baseSlug: string;
  nextStepHref: string | null;
  hasMoreSteps: boolean;
  nextDaySlug?: string | null;
  fromActivity?: boolean;
}) {
  const storageKey = useMemo(() => `branch_next_href::${baseSlug}`, [baseSlug]);
  const [branchHref, setBranchHref] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setBranchHref(saved);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const href = useMemo(() => {
    // Primary: go to the next step when available
    if (hasMoreSteps && nextStepHref) return nextStepHref;
    // From activity view without more steps: allow moving to next day
    if (fromActivity && nextDaySlug) return `/${nextDaySlug}`;
    // Last resort: use stored branch link (might loop back to the same day)
    if (branchHref) return branchHref;
    return null;
  }, [hasMoreSteps, nextStepHref, fromActivity, nextDaySlug, branchHref]);

  if (!href) return null;
  return (
    <div className="mt-6 flex justify-end">
      <a href={href} className="btn btn-primary">Suivant →</a>
    </div>
  );
}
