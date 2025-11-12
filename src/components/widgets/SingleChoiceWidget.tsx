"use client";

import { useEffect, useState } from "react";
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
    <section className="widget-surface p-5 space-y-4">
      {config.title ? <h3 className="text-lg font-semibold">{config.title}</h3> : null}
      {config.question ? <p className="text-sm text-slate-600">{config.question}</p> : null}

      <div className="grid gap-3">
        {config.options.map((opt, idx) => {
          const active = value === idx;
          return (
            <label
              key={`${storageKey}-${idx}`}
              className={`group flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition hover:-translate-y-0.5 hover:shadow ${
                active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'
              }`}
            >
              <input
                type="radio"
                name={`sc-${storageKey}`}
                checked={active}
                onChange={() => setValue(idx)}
                className="mt-1 h-5 w-5 cursor-pointer text-emerald-600 focus:ring-2"
              />
              <div className="flex-1">
                <div className="font-medium">{opt.label}</div>
                {opt.description ? (
                  <div className="text-[0.92rem] leading-[1.6] text-slate-600">{opt.description}</div>
                ) : null}
              </div>
            </label>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-slate-600">
          Choix actuel: {value !== null ? <strong>{config.options[value]?.label}</strong> : <em>Aucun</em>}
        </div>
        <button onClick={reset} className="btn btn-ghost text-xs">Réinitialiser</button>
      </div>
    </section>
  );
}
