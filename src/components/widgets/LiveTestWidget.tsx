"use client";

import { useEffect, useMemo, useState } from "react";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import type { LiveTestWidgetConfig, LiveTestRule } from "@/lib/widget-parser";

const DEFAULT_RULES: LiveTestRule[] = [
  { minYes: 3, label: "Fort candidat Agent — à automatiser maintenant", color: "violet" },
  { minYes: 2, label: "Bon candidat — à automatiser ensuite", color: "green" },
  { minYes: 1, label: "Tâche humaine — garde-la manuelle pour l’instant", color: "slate" },
  { minYes: 0, label: "Pas encore un candidat", color: "gray" },
];

function Badge({ color = "gray", children }: { color?: string; children: React.ReactNode }) {
  const map: Record<string, string> = {
    violet: "border-[color-mix(in_oklab,var(--accent)_50%,transparent)] bg-[color-mix(in_oklab,var(--accent)_14%,#fff)] text-[color-mix(in_oklab,var(--accent)_85%,#0f1728)]",
    green: "border-[color-mix(in_oklab,var(--success)_50%,transparent)] bg-[color-mix(in_oklab,var(--success)_14%,#fff)] text-[color-mix(in_oklab,var(--success)_85%,#0f1728)]",
    gray: "border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_92%,#fff)] text-[color:var(--muted)]",
    slate: "border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_92%,#fff)] text-[color:var(--muted)]",
    red: "border-[color-mix(in_oklab,var(--danger)_50%,transparent)] bg-[color-mix(in_oklab,var(--danger)_14%,#fff)] text-[color-mix(in_oklab,var(--danger)_85%,#0f1728)]",
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
    <section className="surface-card space-y-[var(--space-m)]">
      {config.title ? <Heading level={3}>{config.title}</Heading> : null}
      {config.description ? <Text variant="muted">{config.description}</Text> : null}

      <div className="overflow-hidden rounded-[var(--r-l)] border border-[color:var(--border)] bg-[color:var(--bg-soft)] shadow-sm">
        <table className="w-full text-[0.98rem]">
          <thead className="bg-[color-mix(in_oklab,var(--bg-soft)_90%,white_10%)]">
            <tr>
              <th className="px-[var(--space-4)] py-[var(--space-3)] text-left font-semibold text-[color:var(--fg)]">Question</th>
              <th className="px-[var(--space-4)] py-[var(--space-3)] text-right font-semibold text-[color:var(--fg)]">Oui ?</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q, i) => (
              <tr key={`q-${i}`} className="border-t border-[color:var(--border)]">
                <td className="px-[var(--space-4)] py-[var(--space-3)] text-[color:var(--fg)]">{q}</td>
                <td className="px-[var(--space-4)] py-[var(--space-3)] text-right">
                  <input
                    type="checkbox"
                    checked={answers[i]}
                    onChange={(e) => setAnswers((prev) => prev.map((v, idx) => (idx === i ? e.target.checked : v)))}
                    className="h-5 w-5 rounded border-[color:var(--border)] text-[color:var(--success)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--success)_24%,transparent)]"
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
          <Text variant="small" className="text-[color:var(--muted)]">{yesCount} / {questions.length} Oui</Text>
        </div>
        <button onClick={reset} className="btn btn-ghost text-xs">Réinitialiser</button>
      </div>

      {/* Legend */}
      <div className="surface-panel text-sm text-[color:var(--muted)]">
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
