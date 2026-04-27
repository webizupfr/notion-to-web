"use client";

import { useEffect, useMemo, useState } from "react";
import { Text } from "@/components/ui/Text";
import type { LiveTestWidgetConfig, LiveTestRule } from "@/lib/widget-parser";

const DEFAULT_RULES: LiveTestRule[] = [
  { minYes: 3, label: "Fort candidat Agent — à automatiser maintenant", color: "violet" },
  { minYes: 2, label: "Bon candidat — à automatiser ensuite", color: "green" },
  { minYes: 1, label: "Tâche humaine — garde-la manuelle pour l'instant", color: "slate" },
  { minYes: 0, label: "Pas encore un candidat", color: "gray" },
];

function Badge({ color = "gray", children }: { color?: string; children: React.ReactNode }) {
  const map: Record<string, string> = {
    violet: "border-[color:var(--accent-edge)] bg-[color:var(--accent-bg)] text-[color:var(--text-primary)]",
    green: "border-[color:var(--signal-success)] bg-[color:var(--signal-success-bg)] text-[color:var(--text-primary)]",
    red: "border-[color:var(--signal-danger)] bg-[color:var(--signal-danger-bg)] text-[color:var(--text-primary)]",
    gray: "border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] text-[color:var(--text-secondary)]",
    slate: "border-[color:var(--border-subtle)] bg-[color:var(--surface-2)] text-[color:var(--text-primary)]",
  };
  const cls = map[color] ?? map.gray;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.82rem] font-medium ${cls}`}>
      {children}
    </span>
  );
}

export function LiveTestWidget({ config, storageKey }: { config: LiveTestWidgetConfig; storageKey: string }) {
  const questions = useMemo(
    () => config.questions.map((q) => (typeof q === "string" ? q : q.text)),
    [config.questions],
  );
  const rules = useMemo(
    () =>
      config.rules && config.rules.length
        ? [...config.rules].sort((a, b) => b.minYes - a.minYes)
        : DEFAULT_RULES,
    [config.rules],
  );

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
    try {
      localStorage.setItem(`live_test::${storageKey}`, JSON.stringify(answers));
    } catch {}
  }, [answers, storageKey]);

  const yesCount = answers.filter(Boolean).length;
  const verdict = useMemo(
    () => rules.find((r) => yesCount >= r.minYes) ?? DEFAULT_RULES[DEFAULT_RULES.length - 1],
    [rules, yesCount],
  );

  const reset = () => setAnswers(questions.map(() => false));

  if (!questions.length) {
    return (
      <section className="widget-shell">
        <p className="m-0 text-sm text-[color:var(--text-tertiary)]">Aucune question configurée.</p>
      </section>
    );
  }

  return (
    <section className="widget-shell">
      {config.title || config.description ? (
        <div className="widget-header">
          {config.title ? <h3 className="widget-header__title">{config.title}</h3> : null}
          {config.description ? <p className="widget-header__desc">{config.description}</p> : null}
        </div>
      ) : null}

      {/* Format éditorial : liste de questions (pas de table qui déborde en mobile) */}
      <ul className="m-0 list-none divide-y divide-[color:var(--border-subtle)] rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] p-0">
        {questions.map((q, i) => (
          <li key={`q-${i}`} className="flex items-start gap-3 px-[var(--space-md)] py-[var(--space-sm)]">
            <input
              type="checkbox"
              id={`${storageKey}-q-${i}`}
              checked={answers[i] ?? false}
              onChange={(e) =>
                setAnswers((prev) => prev.map((v, idx) => (idx === i ? e.target.checked : v)))
              }
              className="mt-1 h-5 w-5 flex-shrink-0 rounded border-[color:var(--border-subtle)] text-[color:var(--signal-success)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--signal-success)_24%,transparent)]"
              aria-describedby={`${storageKey}-q-${i}-text`}
            />
            <label
              htmlFor={`${storageKey}-q-${i}`}
              id={`${storageKey}-q-${i}-text`}
              className="flex-1 min-w-0 cursor-pointer text-[0.95rem] leading-[1.5] text-[color:var(--text-primary)]"
            >
              {q}
            </label>
          </li>
        ))}
      </ul>

      <div className="widget-actions">
        <div className="mr-auto flex flex-wrap items-center gap-[var(--space-sm)]" role="status" aria-live="polite">
          <Badge color={verdict.color}>{verdict.label}</Badge>
          <Text
            variant="small"
            className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
          >
            {String(yesCount).padStart(2, "0")} / {String(questions.length).padStart(2, "0")} oui
          </Text>
        </div>
        <button onClick={reset} className="btn btn-ghost text-xs">
          Réinitialiser
        </button>
      </div>

      <div className="widget-preview">
        <span className="widget-preview__label">Règles</span>
        <ul className="m-0 flex flex-wrap gap-3 list-none p-0 text-sm text-[color:var(--text-secondary)]">
          {rules.map((r, idx) => (
            <li key={`r-${idx}`} className="flex items-center gap-2">
              <Badge color={r.color}>{r.minYes}+ oui</Badge>
              <span>{r.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
