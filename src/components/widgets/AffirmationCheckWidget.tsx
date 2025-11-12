"use client";

import { useEffect, useMemo, useState } from "react";
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
    <section className="rounded-[22px] border bg-white/70 backdrop-blur p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{config.title ?? 'Checklist — Affirmations'}</h3>
        <button onClick={reset} className="btn btn-ghost text-xs">Réinitialiser</button>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-[0.98rem]">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Test</th>
              <th className="px-3 py-2 text-left font-semibold">Question</th>
              <th className="px-3 py-2 text-left font-semibold">Oui ?</th>
              {config.showNotes !== false ? (<th className="px-3 py-2 text-left font-semibold">Notes</th>) : null}
            </tr>
          </thead>
          <tbody>
            {config.items.map((it, i) => (
              <tr key={`${storageKey}-${i}`} className={i % 2 === 1 ? 'bg-slate-50/40' : undefined}>
                <td className="px-3 py-3 align-top font-semibold">{it.test}</td>
                <td className="px-3 py-3 align-top">{it.question}</td>
                <td className="px-3 py-3 align-top">
                  <input
                    type="checkbox"
                    checked={answers[i]}
                    onChange={(e) => setAnswers((prev) => prev.map((v, idx) => (idx === i ? e.target.checked : v)))}
                    className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-2"
                  />
                </td>
                {config.showNotes !== false ? (
                  <td className="px-3 py-3 align-top">
                    <input
                      value={notes[i]}
                      onChange={(e) => setNotes((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                      placeholder="✅ / ❌ + remarque courte"
                      className="w-full rounded-lg border bg-white/80 px-3 py-2 text-sm"
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
