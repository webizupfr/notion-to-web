"use client";

import { useEffect, useMemo, useState } from "react";
import type { DecisionFocusWidgetConfig, DecisionFocusField } from "@/lib/widget-parser";
import { useCopy, copyFeedbackLabel } from "./useCopy";

type FieldState = {
  action: string;
  impact: string;
  effort: string;
};

const STORAGE_PREFIX = "decision_focus::";

function defaultState(fields: DecisionFocusField[]): Record<string, FieldState> {
  const initial: Record<string, FieldState> = {};
  for (const field of fields) {
    initial[field.id] = { action: "", impact: "", effort: "" };
  }
  return initial;
}

export function DecisionFocusWidget({
  config,
  storageKey,
}: {
  config: DecisionFocusWidgetConfig;
  storageKey: string;
}) {
  const fields = useMemo(() => config.fields ?? [], [config.fields]);
  const [data, setData] = useState<Record<string, FieldState>>(() => defaultState(fields));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, FieldState>;
        setData((prev) => ({ ...prev, ...parsed }));
      }
    } catch { /* ignore */ }
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, JSON.stringify(data));
    } catch { /* ignore */ }
  }, [data, storageKey, mounted]);

  useEffect(() => {
    setData((prev) => {
      const next = { ...prev };
      for (const field of fields) {
        if (!next[field.id]) next[field.id] = { action: "", impact: "", effort: "" };
      }
      return next;
    });
  }, [fields]);

  const updateField = (fieldId: string, segment: keyof FieldState, value: string) => {
    setData((prev) => ({
      ...prev,
      [fieldId]: { ...prev[fieldId], [segment]: value },
    }));
  };

  const output = useMemo(() => {
    const lines: string[] = [];
    const title = config.outputTitle ?? "Ajustements prioritaires";
    lines.push(`# ${title}`);
    for (const field of fields) {
      const current = data[field.id] ?? { action: "", impact: "", effort: "" };
      const action = current.action.trim();
      const impact = current.impact.trim();
      const effort = current.effort.trim();
      if (!action && !impact && !effort && field.optional) continue;
      lines.push(`## ${field.label}`);
      if (action) lines.push(`- **Action :** ${action}`);
      if (impact) lines.push(`- **Impact attendu :** ${impact}`);
      if (effort) lines.push(`- **Effort estimé :** ${effort}`);
      lines.push("");
    }
    return lines.join("\n").trim();
  }, [fields, data, config.outputTitle]);

  const { copy, status: copyStatus } = useCopy();
  const handleCopy = () => copy(output);

  if (!fields.length) {
    return (
      <section className="widget-shell">
        <p className="m-0 text-sm text-[color:var(--text-tertiary)]">Aucun champ configuré.</p>
      </section>
    );
  }

  return (
    <section className="widget-shell">
      <div className="widget-header">
        {config.title ? <h3 className="widget-header__title">{config.title}</h3> : null}
        <p className="widget-header__desc">
          {config.subtitle ??
            "Sélectionne 1 à 2 évolutions prioritaires. Reste focalisé sur l'impact et la faisabilité."}
        </p>
      </div>

      <div className="grid gap-[var(--space-md)] md:grid-cols-2">
        {fields.map((field) => {
          const current = data[field.id] ?? { action: "", impact: "", effort: "" };
          const impactLabel = field.impactLabel ?? "Impact visé";
          const effortLabel = field.effortLabel ?? "Effort estimé";
          return (
            <article
              key={field.id}
              className="rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] p-[var(--space-md)] min-w-0"
            >
              <header className="mb-[var(--space-sm)] flex items-center justify-between">
                <h4 className="m-0 text-[0.98rem] font-semibold text-[color:var(--text-primary)]">
                  {field.label}
                </h4>
                {field.optional ? (
                  <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                    Optionnel
                  </span>
                ) : null}
              </header>

              <div className="space-y-[var(--space-sm)]">
                <label className="flex flex-col gap-1">
                  <span className="widget-label">Action</span>
                  <textarea
                    rows={3}
                    value={current.action}
                    placeholder={field.placeholder ?? "Quelle évolution veux-tu tester ?"}
                    onChange={(event) => updateField(field.id, "action", event.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="widget-label">{impactLabel}</span>
                  <textarea
                    rows={2}
                    value={current.impact}
                    placeholder={field.impactPlaceholder ?? "Pourquoi c'est prioritaire ?"}
                    onChange={(event) => updateField(field.id, "impact", event.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="widget-label">{effortLabel}</span>
                  <input
                    type="text"
                    value={current.effort}
                    placeholder={field.effortPlaceholder ?? "Temps / ressources / complexité"}
                    onChange={(event) => updateField(field.id, "effort", event.target.value)}
                  />
                </label>
              </div>
            </article>
          );
        })}
      </div>

      <div className="widget-preview">
        <span className="widget-preview__label">Mini-plan</span>
        {output ? (
          <pre className="m-0 whitespace-pre-wrap text-[0.92rem] leading-[1.55] text-[color:var(--text-primary)] font-[family-name:var(--font-mono)]">
            {output}
          </pre>
        ) : (
          <p className="m-0 text-sm text-[color:var(--text-tertiary)] italic">
            Complète au moins une action pour générer ton plan.
          </p>
        )}
      </div>

      <div className="widget-actions">
        <span
          className="mr-auto font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
          role="status"
          aria-live="polite"
        >
          {copyFeedbackLabel(copyStatus)}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="btn btn-primary text-xs"
          disabled={!output}
          aria-disabled={!output}
        >
          Copier le plan
        </button>
      </div>
    </section>
  );
}
