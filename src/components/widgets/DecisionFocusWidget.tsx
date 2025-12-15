"use client";

import { useEffect, useMemo, useState } from "react";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import type { DecisionFocusWidgetConfig, DecisionFocusField } from "@/lib/widget-parser";

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

export function DecisionFocusWidget({ config, storageKey }: { config: DecisionFocusWidgetConfig; storageKey: string }) {
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
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [data, storageKey, mounted]);

  useEffect(() => {
    // If fields prop changes, ensure keys exist
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

  const copyOutput = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="surface-card space-y-[var(--space-m)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {config.title ? <Heading level={3} className="text-[1.12rem] leading-[1.35] text-[color:var(--fg)]">{config.title}</Heading> : null}
          {config.subtitle ? (
            <Text variant="small" className="mt-1 max-w-2xl text-[color:var(--muted)]">{config.subtitle}</Text>
          ) : (
            <Text variant="small" className="mt-1 max-w-2xl text-[color:var(--muted)]">
              Sélectionnez 1 à 2 évolutions prioritaires. Restez focalisé sur l’impact et la faisabilité.
            </Text>
          )}
        </div>
        <button
          type="button"
          onClick={copyOutput}
          className="btn btn-ghost text-xs"
          disabled={!output}
        >
          Copier le plan
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => {
          const current = data[field.id] ?? { action: "", impact: "", effort: "" };
          const impactLabel = field.impactLabel ?? "Impact visé";
          const effortLabel = field.effortLabel ?? "Effort estimé";
          return (
            <article key={field.id} className="rounded-[var(--r-xl)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] p-[var(--space-4)] shadow-sm">
              <header className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[color:var(--fg)]">{field.label}</h4>
                {field.optional ? <span className="text-xs text-[color:var(--muted)]">Optionnel</span> : null}
              </header>

              <div className="space-y-3">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-[color:var(--muted)]">Action</span>
                  <textarea
                    rows={3}
                    value={current.action}
                    placeholder={field.placeholder ?? "Quelle évolution souhaitez-vous tester ?"}
                    onChange={(event) => updateField(field.id, "action", event.target.value)}
                    className="min-h-[92px] resize-y rounded-[var(--r-lg)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] px-[var(--space-3)] py-[var(--space-2)] text-sm text-[color:var(--fg)] shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--primary)_28%,transparent)]"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-[color:var(--muted)]">{impactLabel}</span>
                  <textarea
                    rows={2}
                    value={current.impact}
                    placeholder={field.impactPlaceholder ?? "Pourquoi est-ce prioritaire ? Quelle valeur attendue ?"}
                    onChange={(event) => updateField(field.id, "impact", event.target.value)}
                    className="min-h-[72px] resize-y rounded-[var(--r-lg)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] px-[var(--space-3)] py-[var(--space-2)] text-sm text-[color:var(--fg)] shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--primary)_28%,transparent)]"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-[color:var(--muted)]">{effortLabel}</span>
                  <input
                    type="text"
                    value={current.effort}
                    placeholder={field.effortPlaceholder ?? "Temps / ressources / complexité"}
                    onChange={(event) => updateField(field.id, "effort", event.target.value)}
                    className="rounded-[var(--r-lg)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] px-[var(--space-3)] py-[var(--space-2)] text-sm text-[color:var(--fg)] shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--primary)_28%,transparent)]"
                  />
                </label>
              </div>
            </article>
          );
        })}
      </div>

      <div className="rounded-[var(--r-xl)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] p-[var(--space-4)] text-sm text-[color:var(--muted)] shadow-sm">
        {output ? (
          <pre className="whitespace-pre-wrap text-sm text-[color:var(--fg)]">{output}</pre>
        ) : (
          <p>Complétez au moins une action pour générer votre mini-plan d’ajustements.</p>
        )}
      </div>
    </section>
  );
}
