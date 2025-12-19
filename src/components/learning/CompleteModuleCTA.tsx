"use client";

import { useRouter } from "next/navigation";

type CompleteModuleCTAProps = {
  /** Optionnel : id unique pour ce module/étape */
  progressKey?: string;
  /** Destination une fois terminé (défaut "/") */
  returnTo?: string;
  label?: string;
  className?: string;
};

export function CompleteModuleCTA({
  progressKey,
  returnTo = "/",
  label = "Terminer ce module",
  className,
}: CompleteModuleCTAProps) {
  const router = useRouter();

  const onComplete = () => {
    if (progressKey) {
      try {
        const raw = localStorage.getItem("sprint_progress");
        const data = raw ? JSON.parse(raw) : {};
        data[progressKey] = { done: true, completedAt: Date.now() };
        localStorage.setItem("sprint_progress", JSON.stringify(data));
      } catch {
        // ignore storage errors
      }
    }

    router.push(returnTo);
  };

  const rootClass = ["learning-complete-cta", className].filter(Boolean).join(" ");

  return (
    <div className={rootClass}>
      <button type="button" className="learning-complete-cta__btn" onClick={onComplete}>
        {label}
      </button>
    
    </div>
  );
}
