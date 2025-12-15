"use client";

import { useEffect, useMemo, useState } from "react";
import { Heading } from "@/components/ui/Heading";
import type { AffirmationCheckWidgetConfig } from "@/lib/widget-parser";

export function AffirmationCheckWidget({ config, storageKey }: { config: AffirmationCheckWidgetConfig; storageKey: string }) {
  const [answers, setAnswers] = useState<boolean[]>(() => config.items.map(() => false));
  const [notes, setNotes] = useState<string[]>(() => config.items.map(() => ""));
  const key = useMemo(() => `affirmation_check::${storageKey}`, [storageKey]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const obj = JSON.parse(saved) as { a?: boolean[]; n?: string[] };
        if (Array.isArray(obj.a) && obj.a.length === config.items.length) setAnswers(obj.a);
        if (Array.isArray(obj.n) && obj.n.length === config.items.length) setNotes(obj.n);
      }
    } catch {}
  }, [key, config.items.length]);

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify({ a: answers, n: notes })); } catch {}
  }, [key, answers, notes]);

  const reset = () => { setAnswers(config.items.map(() => false)); setNotes(config.items.map(() => "")); };

  return (
    <section className="surface-card space-y-[var(--space-m)]">
      <div className="flex items-center justify-between">
        <Heading level={3}>{config.title ?? "Checklist — Affirmations"}</Heading>
        <button onClick={reset} className="btn btn-ghost text-xs">
          Réinitialiser
        </button>
      </div>

      <div className="overflow-hidden rounded-[var(--r-l)] border border-[color:var(--border)] bg-[color:var(--bg-soft)] shadow-[var(--shadow-s)]">
        <table className="w-full text-[0.98rem]">
          <thead className="bg-[color-mix(in_srgb,var(--bg-soft)_90%,white_10%)]">
            <tr>
              <th className="px-[var(--space-3)] py-[var(--space-2)] text-left font-semibold text-[color:var(--fg)]">
                Test
              </th>
              <th className="px-[var(--space-3)] py-[var(--space-2)] text-left font-semibold text-[color:var(--fg)]">
                Question
              </th>
              <th className="px-[var(--space-3)] py-[var(--space-2)] text-left font-semibold text-[color:var(--fg)]">
                Oui ?
              </th>
              {config.showNotes !== false ? (
                <th className="px-[var(--space-3)] py-[var(--space-2)] text-left font-semibold text-[color:var(--fg)]">
                  Notes
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {config.items.map((it, i) => (
              <tr
                key={`${storageKey}-${i}`}
                className={i % 2 === 1 ? "bg-[color-mix(in_srgb,var(--bg-soft)_94%,white_6%)]" : undefined}
              >
                <td className="px-[var(--space-3)] py-[var(--space-3)] align-top font-semibold text-[color:var(--fg)]">
                  {it.test}
                </td>
                <td className="px-[var(--space-3)] py-[var(--space-3)] align-top text-[color:var(--fg)]">
                  {it.question}
                </td>
                <td className="px-[var(--space-3)] py-[var(--space-3)] align-top">
                  <input
                    type="checkbox"
                    checked={answers[i]}
                    onChange={(e) =>
                      setAnswers((prev) => prev.map((v, idx) => (idx === i ? e.target.checked : v)))
                    }
                    className="h-5 w-5 rounded border-[color:var(--border)] text-[color:var(--success)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--success)_24%,transparent)]"
                  />
                </td>
                {config.showNotes !== false ? (
                  <td className="px-[var(--space-3)] py-[var(--space-3)] align-top">
                    <input
                      value={notes[i]}
                      onChange={(e) =>
                        setNotes((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                      }
                      placeholder="✅ / ❌ + remarque courte"
                      className="w-full rounded-[var(--r-m)] border border-[color:var(--border)] bg-[color:var(--bg-card)] px-[var(--space-3)] py-[var(--space-2)] text-sm text-[color:var(--fg)] shadow-sm focus:border-[color-mix(in_oklab,var(--primary)_50%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--primary)_22%,transparent)]"
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
