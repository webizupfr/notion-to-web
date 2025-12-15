"use client";

import { useEffect, useState } from "react";

import type { QuizWidgetConfig } from "@/lib/widget-parser";

type QuizStorage = {
  selectedIndex: number | null;
};

export function QuizWidget({ config, storageKey }: { config: QuizWidgetConfig; storageKey: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as QuizStorage;
        setSelected(typeof parsed.selectedIndex === 'number' ? parsed.selectedIndex : null);
      }
    } catch {
      // ignore local storage errors
    }
    setMounted(true);
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;
    try {
      const payload: QuizStorage = { selectedIndex: selected };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // ignore persistence errors
    }
  }, [mounted, selected, storageKey]);

  const handleSelect = (index: number) => {
    setSelected((prev) => (prev === index ? null : index));
  };

  const handleReset = () => {
    setSelected(null);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  return (
    <section className="surface-card space-y-[var(--space-m)]">
      <p className="text-sm font-medium text-[color:var(--fg)]">{config.question}</p>

      <div className="space-y-3">
        {config.options.map((option, index) => {
          const isActive = selected === index;
          const isCorrect = option.correct ?? false;
          return (
            <div key={`${storageKey}-option-${index}`} className="space-y-2">
              <button
                type="button"
                onClick={() => handleSelect(index)}
                className={`w-full rounded-[var(--r-xl)] border px-[var(--space-4)] py-[var(--space-4)] text-left transition hover:-translate-y-0.5 hover:shadow ${
                  isActive
                    ? isCorrect
                      ? 'border-[color-mix(in_oklab,var(--success)_55%,transparent)] bg-[color-mix(in_oklab,var(--success)_14%,#fff)]'
                      : 'border-[color-mix(in_oklab,var(--accent)_55%,transparent)] bg-[color-mix(in_oklab,var(--accent)_14%,#fff)]'
                    : 'border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold text-[color:var(--fg)] border-[color:var(--border)]">
                    {option.label ?? String.fromCharCode(65 + index)}
                  </span>
                  <div className="space-y-2 text-sm leading-6 text-[color:var(--fg)]">
                    <div className="whitespace-pre-wrap">{option.text}</div>
                  </div>
                </div>
              </button>
              {isActive && option.feedback && (
                <div
                  className={`rounded-[var(--r-xl)] border px-[var(--space-4)] py-[var(--space-3)] text-sm leading-6 ${
                    isCorrect
                      ? 'border-[color-mix(in_oklab,var(--success)_45%,transparent)] bg-[color-mix(in_oklab,var(--success)_16%,#fff)] text-[color-mix(in_oklab,var(--success)_85%,#0f1728)]'
                      : 'border-[color-mix(in_oklab,var(--accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--accent)_16%,#fff)] text-[color-mix(in_oklab,var(--accent)_85%,#0f1728)]'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span aria-hidden>{isCorrect ? '✅' : '💡'}</span>
                    <div className="whitespace-pre-wrap">{option.feedback}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button onClick={handleReset} className="btn btn-ghost text-xs">
          Réinitialiser
        </button>
      </div>
    </section>
  );
}
