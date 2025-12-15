"use client";

import { useEffect, useState } from "react";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import type { SingleChoiceWidgetConfig } from "@/lib/widget-parser";

export function SingleChoiceWidget({ config, storageKey }: { config: SingleChoiceWidgetConfig; storageKey: string }) {
  const [value, setValue] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`single_choice::${storageKey}`);
      if (saved !== null) {
        const n = Number(saved);
        if (Number.isFinite(n)) setValue(n);
        return;
      }
    } catch {}
    if (config.defaultIndex !== undefined && Number.isFinite(config.defaultIndex)) {
      setValue(config.defaultIndex!);
    }
  }, [config.defaultIndex, storageKey]);

  useEffect(() => {
    try {
      if (value === null) localStorage.removeItem(`single_choice::${storageKey}`);
      else localStorage.setItem(`single_choice::${storageKey}`, String(value));
    } catch {}
  }, [value, storageKey]);

  const reset = () => setValue(null);

  return (
    <section className="surface-card space-y-[var(--space-m)]">
      {config.title ? <Heading level={3} className="text-[1.12rem] leading-[1.35]">{config.title}</Heading> : null}
      {config.question ? <Text variant="small" className="text-[color:var(--muted)]">{config.question}</Text> : null}

      <div className="grid gap-3">
        {config.options.map((opt, idx) => {
          const active = value === idx;
          return (
            <label
              key={`${storageKey}-${idx}`}
              className={`group flex cursor-pointer items-start gap-3 rounded-[var(--r-lg)] border px-[var(--space-4)] py-[var(--space-3)] transition hover:-translate-y-0.5 hover:shadow ${
                active
                  ? 'border-[color-mix(in_oklab,var(--success)_55%,transparent)] bg-[color-mix(in_oklab,var(--success)_12%,#fff)]'
                  : 'border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)]'
              }`}
            >
              <input
                type="radio"
                name={`sc-${storageKey}`}
                checked={active}
                onChange={() => setValue(idx)}
                className="mt-1 h-5 w-5 cursor-pointer text-[color:var(--success)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--success)_24%,transparent)]"
              />
              <div className="flex-1">
                <div className="font-medium text-[color:var(--fg)]">{opt.label}</div>
                {opt.description ? (
                  <div className="text-[0.92rem] leading-[1.6] text-[color:var(--muted)]">{opt.description}</div>
                ) : null}
              </div>
            </label>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-[color:var(--muted)]">
          Choix actuel: {value !== null ? <strong>{config.options[value]?.label}</strong> : <em>Aucun</em>}
        </div>
        <button onClick={reset} className="btn btn-ghost text-xs">Réinitialiser</button>
      </div>
    </section>
  );
}
