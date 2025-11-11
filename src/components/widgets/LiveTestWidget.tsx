"use client";

import { useEffect, useMemo, useState } from "react";
import type { LiveTestWidgetConfig, LiveTestRule } from "@/lib/widget-parser";

const DEFAULT_RULES: LiveTestRule[] = [
  { minYes: 3, label: "Fort candidat Agent — à automatiser maintenant", color: "violet" },
  { minYes: 2, label: "Bon candidat — à automatiser ensuite", color: "green" },
  { minYes: 1, label: "Tâche humaine — garde-la manuelle pour l’instant", color: "slate" },
  { minYes: 0, label: "Pas encore un candidat", color: "gray" },
];

function Badge({ color = "gray", children }: { color?: string; children: React.ReactNode }) {
  const map: Record<string, string> = {
    violet: "bg-violet-100 text-violet-700 border-violet-300",
    green: "bg-emerald-100 text-emerald-700 border-emerald-300",
    gray: "bg-slate-100 text-slate-700 border-slate-300",
    slate: "bg-slate-100 text-slate-700 border-slate-300",
    red: "bg-rose-100 text-rose-700 border-rose-300",
  };
  const cls = map[color] ?? map.gray;
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${cls}`}>{children}</span>;
}

export function LiveTestWidget({ config, storageKey }: { config: LiveTestWidgetConfig; storageKey: string }) {
  const questions = useMemo(() => config.questions.map((q) => (typeof q === 'string' ? q : q.text)), [config.questions]);
  const rules = useMemo(() => (config.rules && config.rules.length ? [...config.rules].sort((a, b) => b.minYes - a.minYes) : DEFAULT_RULES), [config.rules]);

  const [answers, setAnswers] = useState<boolean[]>(() => questions.map(() => false));

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`live_test::${storageKey}`);
      if (saved) {
        const arr = JSON.parse(saved) as boolean[];
        if (Array.isArray(arr) && arr.length === questions.length) setAnswers(arr);
      }
    } catch {}
  }, [questions.length, storageKey]);

  useEffect(() => {
    try { localStorage.setItem(`live_test::${storageKey}`, JSON.stringify(answers)); } catch {}
  }, [answers, storageKey]);

  const yesCount = answers.filter(Boolean).length;
  const verdict = useMemo(() => rules.find((r) => yesCount >= r.minYes) ?? DEFAULT_RULES[DEFAULT_RULES.length - 1], [rules, yesCount]);

  const reset = () => setAnswers(questions.map(() => false));

  return (
    <section className="widget-surface p-5 space-y-4">
      {config.title ? <h3 className="text-lg font-semibold">{config.title}</h3> : null}
      {config.description ? <p className="text-sm text-slate-600">{config.description}</p> : null}

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-[0.98rem]">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Question</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Oui ?</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q, i) => (
              <tr key={`q-${i}`} className="border-t">
                <td className="px-4 py-3">{q}</td>
                <td className="px-4 py-3 text-right">
                  <input
                    type="checkbox"
                    checked={answers[i]}
                    onChange={(e) => setAnswers((prev) => prev.map((v, idx) => (idx === i ? e.target.checked : v)))}
                    className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-2"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge color={verdict.color}>{verdict.label}</Badge>
          <span className="text-sm text-slate-500">{yesCount} / {questions.length} Oui</span>
        </div>
        <button onClick={reset} className="btn btn-ghost text-xs">Réinitialiser</button>
      </div>

      {/* Legend */}
      <div className="rounded-xl border bg-white/60 p-3 text-sm text-slate-600">
        <div className="flex flex-wrap gap-4">
          {rules.map((r, idx) => (
            <div key={`r-${idx}`} className="flex items-center gap-2">
              <Badge color={r.color}>{r.minYes}+ Oui</Badge>
              <span>{r.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
