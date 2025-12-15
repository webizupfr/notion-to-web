"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

export function StepNavBar({
  basePath,
  currentIndex,
  total,
  currentStepId,
}: {
  basePath: string;
  currentIndex: number;
  total: number;
  currentStepId: string;
}) {
  const router = useRouter();
  const storageKey = useMemo(() => `sprint_progress::${basePath}`, [basePath]);

  const prevHref = currentIndex - 1 <= 0 ? `${basePath}#steps` : `${basePath}?step=${currentIndex}#steps`;
  const nextHref = `${basePath}?step=${currentIndex + 2}#steps`;

  const onPrev = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    router.push(prevHref);
  };

  const onNext = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    // Marquer l'étape actuelle comme faite
    try {
      const raw = localStorage.getItem(storageKey);
      const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      map[currentStepId] = true;
      localStorage.setItem(storageKey, JSON.stringify(map));
    } catch {/* ignore */}
    router.push(nextHref);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 bg-[rgba(255,255,255,0.96)] backdrop-blur supports-[backdrop-filter]:bg-[rgba(255,255,255,0.94)] shadow-[0_-16px_40px_rgba(15,23,40,0.18)]">
      <div className="mx-auto flex w-full max-w-[1800px] items-center justify-end gap-3 px-4 py-4">
        {currentIndex > 0 ? (
          <a
            href={prevHref}
            onClick={onPrev}
            className="btn btn-ghost text-[0.95rem] hover:-translate-y-[1px]"
          >
            ← Précédent
          </a>
        ) : null}
        {currentIndex < total - 1 ? (
          <a
            href={nextHref}
            onClick={onNext}
            className="btn btn-primary text-[0.95rem] hover:-translate-y-[1px]"
          >
            Suivant →
          </a>
        ) : null}
      </div>
    </div>
  );
}
