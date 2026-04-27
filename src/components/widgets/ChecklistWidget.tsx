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

  if (!count) {
    return (
      <section className="widget-shell">
        <p className="m-0 text-sm text-[color:var(--text-tertiary)]">Checklist vide.</p>
      </section>
    );
  }

  return (
    <section className="widget-shell">
      <div className="flex flex-wrap items-start justify-between gap-[var(--space-md)]">
        <div className="min-w-0 flex-1">
          <Heading level={3} className="text-[1.05rem]">{config.title ?? "Checklist"}</Heading>
          <div
            className="mt-[var(--space-xs)] h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-[color:var(--surface-2)]"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${done} sur ${count} complétés`}
          >
            <div
              className="h-full bg-[color:var(--signal-success)] transition-all duration-[var(--dur-slow)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p
            className="mt-[var(--space-xs)] font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
            role="status"
            aria-live="polite"
          >
            {String(done).padStart(2, "0")} / {String(count).padStart(2, "0")} complété{done > 1 ? "s" : ""}
            {allDone ? " · ✓ Tout est fait" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reset} className="btn btn-ghost text-xs">
            Réinitialiser
          </button>
          {config.cta ? (
            <a
              href={config.cta.href ?? '#'}
              className={`btn btn-primary text-xs ${allDone ? '' : 'pointer-events-none opacity-60'}`}
              aria-disabled={!allDone}
            >
              {config.cta.label}
            </a>
          ) : null}
        </div>
      </div>

      <div className={`grid gap-[var(--space-sm)] ${gridCols}`}>
        {config.items.map((item, i) => (
          <div
            key={`${storageKey}-${i}`}
            className="rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] px-[var(--space-md)] py-[var(--space-sm)]"
          >
            <details>
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <input
                  type="checkbox"
                  checked={checked[i] ?? false}
                  onChange={() => toggle(i)}
                  className="h-5 w-5 rounded border-[color:var(--border-subtle)] text-[color:var(--signal-success)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--signal-success)_30%,transparent)]"
                  aria-label={item.label}
                />
                <Text as="span" variant="body" className="font-medium">
                  {item.label}
                </Text>
              </summary>
              {item.help ? (
                <Text variant="small" className="mt-[var(--space-xs)] pl-8 text-[color:var(--text-tertiary)] block">
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
