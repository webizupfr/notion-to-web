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
    <section className="space-y-4 widget-surface px-5 py-6">
      <p className="text-sm font-medium text-slate-700">{config.question}</p>

      <div className="space-y-3">
        {config.options.map((option, index) => {
          const isActive = selected === index;
          const isCorrect = option.correct ?? false;
          return (
            <div key={`${storageKey}-option-${index}`} className="space-y-2">
              <button
                type="button"
                onClick={() => handleSelect(index)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition hover:-translate-y-0.5 hover:shadow ${
                  isActive
                    ? isCorrect
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-amber-400 bg-amber-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold">
                    {option.label ?? String.fromCharCode(65 + index)}
                  </span>
                  <div className="space-y-2 text-sm leading-6 text-slate-800">
                    <div className="whitespace-pre-wrap">{option.text}</div>
                  </div>
                </div>
              </button>
              {isActive && option.feedback && (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                    isCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'
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
