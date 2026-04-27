"use client";

import { useEffect, useMemo, useState } from "react";
import type { AffirmationCheckWidgetConfig } from "@/lib/widget-parser";

export function AffirmationCheckWidget({
  config,
  storageKey,
}: {
  config: AffirmationCheckWidgetConfig;
  storageKey: string;
}) {
  const [answers, setAnswers] = useState<boolean[]>(() => config.items.map(() => false));
  const [notes, setNotes] = useState<string[]>(() => config.items.map(() => ""));
  const key = useMemo(() => `affirmation_check::${storageKey}`, [storageKey]);
  const showNotes = config.showNotes !== false;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const obj = JSON.parse(saved) as { a?: boolean[]; n?: string[] };
        if (Array.isArray(obj.a) && obj.a.length === config.items.length) setAnswers(obj.a);
        if (Array.isArray(obj.n) && obj.n.length === config.items.length) setNotes(obj.n);
      }
    } catch { /* ignore */ }
  }, [key, config.items.length]);

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ a: answers, n: notes }));
    } catch { /* ignore */ }
  }, [key, answers, notes]);

  const reset = () => {
    setAnswers(config.items.map(() => false));
    setNotes(config.items.map(() => ""));
  };

  const yesCount = answers.filter(Boolean).length;

  if (!config.items.length) {
    return (
      <section className="widget-shell">
        <p className="m-0 text-sm text-[color:var(--text-tertiary)]">Aucun item configuré.</p>
      </section>
    );
  }

  return (
    <section className="widget-shell">
      <div className="widget-header">
        <h3 className="widget-header__title">{config.title ?? "Checklist — Affirmations"}</h3>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-hidden rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]">
        <table className="w-full text-[0.95rem]">
          <thead className="bg-[color:var(--surface-2)]">
            <tr>
              <th className="px-[var(--space-md)] py-[var(--space-sm)] text-left font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                Test
              </th>
              <th className="px-[var(--space-md)] py-[var(--space-sm)] text-left font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                Question
              </th>
              <th className="px-[var(--space-md)] py-[var(--space-sm)] text-center font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                Oui ?
              </th>
              {showNotes ? (
                <th className="px-[var(--space-md)] py-[var(--space-sm)] text-left font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                  Notes
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {config.items.map((it, i) => (
              <tr
                key={`${storageKey}-${i}`}
                className={`border-t border-[color:var(--border-subtle)] ${i % 2 === 1 ? "bg-[color:var(--surface-1)]" : ""}`}
              >
                <td className="px-[var(--space-md)] py-[var(--space-sm)] align-top font-semibold text-[color:var(--text-primary)]">
                  {it.test}
                </td>
                <td className="px-[var(--space-md)] py-[var(--space-sm)] align-top text-[color:var(--text-primary)]">
                  {it.question}
                </td>
                <td className="px-[var(--space-md)] py-[var(--space-sm)] align-top text-center">
                  <input
                    type="checkbox"
                    checked={answers[i] ?? false}
                    onChange={(e) =>
                      setAnswers((prev) =>
                        prev.map((v, idx) => (idx === i ? e.target.checked : v)),
                      )
                    }
                    className="h-5 w-5 rounded border-[color:var(--border-subtle)] text-[color:var(--signal-success)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--signal-success)_24%,transparent)]"
                    aria-label={`${it.test} - ${it.question}`}
                  />
                </td>
                {showNotes ? (
                  <td className="px-[var(--space-md)] py-[var(--space-sm)] align-top">
                    <input
                      value={notes[i] ?? ""}
                      onChange={(e) =>
                        setNotes((prev) =>
                          prev.map((v, idx) => (idx === i ? e.target.value : v)),
                        )
                      }
                      placeholder="Remarque courte"
                      aria-label={`Notes pour ${it.test}`}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stack */}
      <div className="md:hidden space-y-[var(--space-sm)]">
        {config.items.map((it, i) => (
          <div
            key={`m-${storageKey}-${i}`}
            className={`rounded-[var(--r-m)] border px-[var(--space-md)] py-[var(--space-sm)] transition-colors ${
              answers[i]
                ? "border-[color:var(--signal-success)] bg-[color:var(--signal-success-bg)]"
                : "border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]"
            }`}
          >
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={answers[i] ?? false}
                onChange={(e) =>
                  setAnswers((prev) =>
                    prev.map((v, idx) => (idx === i ? e.target.checked : v)),
                  )
                }
                className="mt-1 h-5 w-5 flex-shrink-0 rounded border-[color:var(--border-subtle)] text-[color:var(--signal-success)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--signal-success)_24%,transparent)]"
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[color:var(--text-primary)]">{it.test}</div>
                <div className="mt-1 text-[0.92rem] text-[color:var(--text-secondary)]">{it.question}</div>
              </div>
            </label>
            {showNotes ? (
              <input
                value={notes[i] ?? ""}
                onChange={(e) =>
                  setNotes((prev) =>
                    prev.map((v, idx) => (idx === i ? e.target.value : v)),
                  )
                }
                placeholder="Remarque courte"
                className="mt-2"
                aria-label={`Notes pour ${it.test}`}
              />
            ) : null}
          </div>
        ))}
      </div>

      <div className="widget-actions">
        <span
          className="mr-auto font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
          role="status"
          aria-live="polite"
        >
          {String(yesCount).padStart(2, "0")} / {String(config.items.length).padStart(2, "0")} validé{yesCount > 1 ? "s" : ""}
        </span>
        <button onClick={reset} className="btn btn-ghost text-xs">
          Réinitialiser
        </button>
      </div>
    </section>
  );
}
