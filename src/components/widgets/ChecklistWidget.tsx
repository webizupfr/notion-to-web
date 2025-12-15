"use client";

import { useEffect, useMemo, useState } from "react";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
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
    <section className="surface-card space-y-[var(--space-m)]">
      <div className="flex items-center justify-between">
        <div>
          <Heading level={3}>{config.title ?? "Checklist"}</Heading>
          <div className="mt-[var(--space-xs)] h-2 w-full max-w-sm overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--bg-soft)_88%,white_12%)]">
            <div className="h-full bg-[color:var(--success)] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <Text variant="small" className="mt-[var(--space-xs)] text-[color:var(--fg-muted)]">
            {done} / {count} complétés
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset} className="btn btn-ghost text-xs">
            Réinitialiser
          </button>
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

      <div className={`grid gap-[var(--space-3)] ${gridCols}`}>
        {config.items.map((item, i) => (
          <div key={`${storageKey}-${i}`} className="surface-panel">
            <details>
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <input
                  type="checkbox"
                  checked={checked[i]}
                  onChange={() => toggle(i)}
                  className="h-5 w-5 rounded border-[color:var(--border)] text-[color:var(--success)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--success)_30%,transparent)] focus:ring-offset-0"
                />
                <Text as="span" variant="body" className="font-medium">
                  {item.label}
                </Text>
              </summary>
              {item.help ? (
                <Text variant="small" className="mt-[var(--space-xs)] pl-8 text-[color:var(--fg-muted)] block">
                  {item.help}
                </Text>
              ) : null}
            </details>
          </div>
        ))}
      </div>
    </section>
  );
}
