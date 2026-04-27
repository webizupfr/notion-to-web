"use client";

import { useEffect, useState } from "react";
import type { SingleChoiceWidgetConfig } from "@/lib/widget-parser";

export function SingleChoiceWidget({
  config,
  storageKey,
}: {
  config: SingleChoiceWidgetConfig;
  storageKey: string;
}) {
  const [value, setValue] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`single_choice::${storageKey}`);
      if (saved !== null) {
        const n = Number(saved);
        if (Number.isFinite(n)) {
          setValue(n);
          return;
        }
      }
    } catch { /* ignore */ }
    if (config.defaultIndex !== undefined && Number.isFinite(config.defaultIndex)) {
      setValue(config.defaultIndex);
    }
  }, [config.defaultIndex, storageKey]);

  useEffect(() => {
    try {
      if (value === null) localStorage.removeItem(`single_choice::${storageKey}`);
      else localStorage.setItem(`single_choice::${storageKey}`, String(value));
    } catch { /* ignore */ }
  }, [value, storageKey]);

  const reset = () => setValue(null);

  if (!config.options.length) {
    return (
      <section className="widget-shell">
        <p className="m-0 text-sm text-[color:var(--text-tertiary)]">Aucune option configurée.</p>
      </section>
    );
  }

  return (
    <section className="widget-shell">
      {config.title || config.question ? (
        <div className="widget-header">
          {config.title ? <h3 className="widget-header__title">{config.title}</h3> : null}
          {config.question ? <p className="widget-header__desc">{config.question}</p> : null}
        </div>
      ) : null}

      <div className="grid gap-[var(--space-xs)]" role="radiogroup" aria-label={config.question ?? config.title ?? "Choix"}>
        {config.options.map((opt, idx) => {
          const active = value === idx;
          return (
            <label
              key={`${storageKey}-${idx}`}
              className={`group flex cursor-pointer items-start gap-3 rounded-[var(--r-m)] border px-[var(--space-md)] py-[var(--space-sm)] transition-colors ${
                active
                  ? "border-[color:var(--accent-edge)] bg-[color:var(--accent-bg)]"
                  : "border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] hover:border-[color:var(--border-strong)]"
              }`}
            >
              <input
                type="radio"
                name={`sc-${storageKey}`}
                checked={active}
                onChange={() => setValue(idx)}
                className="mt-1 h-5 w-5 cursor-pointer text-[color:var(--accent)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent)_24%,transparent)]"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[color:var(--text-primary)]">{opt.label}</div>
                {opt.description ? (
                  <div className="text-[0.92rem] leading-[1.55] text-[color:var(--text-secondary)]">{opt.description}</div>
                ) : null}
              </div>
            </label>
          );
        })}
      </div>

      <div className="widget-actions">
        <span
          className="mr-auto text-sm text-[color:var(--text-secondary)]"
          role="status"
          aria-live="polite"
        >
          {value !== null ? (
            <>Choix: <strong className="text-[color:var(--text-primary)]">{config.options[value]?.label}</strong></>
          ) : (
            <em className="text-[color:var(--text-tertiary)]">Aucun choix</em>
          )}
        </span>
        <button onClick={reset} className="btn btn-ghost text-xs">
          Réinitialiser
        </button>
      </div>
    </section>
  );
}
