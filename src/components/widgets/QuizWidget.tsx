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

  if (!config.options.length) {
    return (
      <section className="widget-shell">
        <p className="m-0 text-sm text-[color:var(--text-tertiary)]">Quiz sans option configurée.</p>
      </section>
    );
  }

  return (
    <section className="widget-shell">
      <p className="m-0 text-[0.98rem] font-medium text-[color:var(--text-primary)]">{config.question}</p>

      <div className="space-y-[var(--space-xs)]" role="radiogroup" aria-label={config.question}>
        {config.options.map((option, index) => {
          const isActive = selected === index;
          const isCorrect = option.correct ?? false;
          return (
            <div key={`${storageKey}-option-${index}`} className="space-y-2">
              <button
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => handleSelect(index)}
                className={`w-full rounded-[var(--r-m)] border px-[var(--space-md)] py-[var(--space-sm)] text-left transition-colors ${
                  isActive
                    ? isCorrect
                      ? 'border-[color:var(--signal-success)] bg-[color:var(--signal-success-bg)]'
                      : 'border-[color:var(--accent-edge)] bg-[color:var(--accent-bg)]'
                    : 'border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] hover:border-[color:var(--border-strong)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-[2px] inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[var(--r-s)] border text-xs font-semibold font-[family-name:var(--font-mono)] ${
                      isActive
                        ? isCorrect
                          ? 'border-[color:var(--signal-success)] bg-[color:var(--signal-success)] text-white'
                          : 'border-[color:var(--accent-edge)] bg-[color:var(--accent)] text-[color:var(--accent-ink)]'
                        : 'border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] text-[color:var(--text-secondary)]'
                    }`}
                    aria-hidden
                  >
                    {option.label ?? String.fromCharCode(65 + index)}
                  </span>
                  <div className="min-w-0 text-sm leading-6 text-[color:var(--text-primary)] whitespace-pre-wrap">
                    {option.text}
                  </div>
                </div>
              </button>
              {isActive && option.feedback && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`rounded-[var(--r-m)] border px-[var(--space-md)] py-[var(--space-sm)] text-sm leading-6 ${
                    isCorrect
                      ? 'border-[color:var(--signal-success)] bg-[color:var(--signal-success-bg)] text-[color:var(--text-primary)]'
                      : 'border-[color:var(--accent-edge)] bg-[color:var(--accent-bg)] text-[color:var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span aria-hidden>{isCorrect ? '✓' : '💡'}</span>
                    <div className="whitespace-pre-wrap">{option.feedback}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="widget-actions">
        <span
          className="mr-auto font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
          role="status"
          aria-live="polite"
        >
          {selected === null ? "En attente" : "Réponse enregistrée"}
        </span>
        <button onClick={handleReset} className="btn btn-ghost text-xs">
          Réinitialiser
        </button>
      </div>
    </section>
  );
}
