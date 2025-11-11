"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChecklistWidgetConfig } from "@/lib/widget-parser";

export function ChecklistWidget({ config, storageKey }: { config: ChecklistWidgetConfig; storageKey: string }) {
  const count = config.items.length;
  const [checked, setChecked] = useState<boolean[]>(() => config.items.map(() => false));

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`checklist::${storageKey}`);
      const arr = saved ? (JSON.parse(saved) as boolean[]) : null;
      if (Array.isArray(arr) && arr.length === count) setChecked(arr);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, storageKey]);

  useEffect(() => {
    try { localStorage.setItem(`checklist::${storageKey}`, JSON.stringify(checked)); } catch {}
  }, [checked, storageKey]);

  const done = checked.filter(Boolean).length;
  const progress = Math.round((done / Math.max(1, count)) * 100);
  const allDone = done === count;

  const toggle = (idx: number) => setChecked((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  const reset = () => setChecked(config.items.map(() => false));

  const gridCols = useMemo(() => (config.columns === 1 ? "md:grid-cols-1" : "md:grid-cols-2"), [config.columns]);

  return (
    <section className="widget-surface p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{config.title ?? "Checklist"}</h3>
          <div className="mt-2 h-2 w-full max-w-sm overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-1 text-xs text-slate-600">{done} / {count} complétés</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset} className="btn btn-ghost text-xs">Réinitialiser</button>
          {config.cta ? (
            <a
              href={config.cta.href ?? '#'}
              className={`btn btn-primary text-xs ${allDone ? '' : 'opacity-60 pointer-events-none'}`}
              aria-disabled={!allDone}
            >
              {config.cta.label}
            </a>
          ) : null}
        </div>
      </div>

      <div className={`grid gap-3 ${gridCols}`}>
        {config.items.map((item, i) => (
          <div key={`${storageKey}-${i}`} className="rounded-xl border bg-white/80 p-3">
            <details>
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <input
                  type="checkbox"
                  checked={checked[i]}
                  onChange={() => toggle(i)}
                  className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-2"
                />
                <span className="font-medium text-[0.98rem]">{item.label}</span>
              </summary>
              {item.help ? (
                <div className="mt-2 pl-8 text-[0.92rem] text-slate-600">{item.help}</div>
              ) : null}
            </details>
          </div>
        ))}
      </div>
    </section>
  );
}
