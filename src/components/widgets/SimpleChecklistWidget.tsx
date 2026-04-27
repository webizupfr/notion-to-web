"use client";

import { useEffect, useState } from "react";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import type { SimpleChecklistWidgetConfig } from "@/lib/widget-parser";

export function SimpleChecklistWidget({ config, storageKey }: { config: SimpleChecklistWidgetConfig; storageKey: string }) {
  const hasBoxes = Boolean(config.showBoxes);
  const [checked, setChecked] = useState<boolean[]>(() => config.items.map(() => false));
  const [capture, setCapture] = useState(false);

  useEffect(() => {
    if (!hasBoxes) return;
    try {
      const saved = localStorage.getItem(`simple_checklist::${storageKey}`);
      const arr = saved ? (JSON.parse(saved) as boolean[]) : null;
      if (Array.isArray(arr) && arr.length === config.items.length) setChecked(arr);
    } catch {}
  }, [hasBoxes, config.items.length, storageKey]);

  useEffect(() => {
    if (!hasBoxes) return;
    try { localStorage.setItem(`simple_checklist::${storageKey}`, JSON.stringify(checked)); } catch {}
  }, [checked, hasBoxes, storageKey]);

  const done = checked.filter(Boolean).length;
  const allDone = hasBoxes && done === config.items.length && config.items.length > 0;

  // Normalize items to { text, heading }
  const items = (config.items as Array<string | { text: string; heading?: boolean }>).map((it) =>
    typeof it === 'string' ? { text: it, heading: false } : { text: it.text, heading: Boolean(it.heading) }
  );

  return (
    <section className={`space-y-[var(--space-s)] ${capture ? "" : "surface-card"}`}>
      {config.title ? (
        <Heading level={3}>
          {allDone ? '✅ ' : ''}{config.title}
        </Heading>
      ) : null}

      {hasBoxes ? (
        <ul className="space-y-2">
          {items.map((it, i) => (
            it.heading ? (
              <li key={`${storageKey}-${i}`} className="pt-3 font-semibold text-[color:var(--text-primary)]">
                {it.text}
              </li>
            ) : (
              <li key={`${storageKey}-${i}`} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked[i] ?? false}
                  onChange={() => setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)))}
                  className="mt-1 h-5 w-5 rounded border-[color:var(--border-subtle)] text-[color:var(--signal-success)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--signal-success)_24%,transparent)]"
                  aria-label={it.text}
                />
                <div className="leading-[1.6] text-[color:var(--text-primary)]">{it.text}</div>
              </li>
            )
          ))}
        </ul>
      ) : (
        <ul className="list-disc space-y-2 pl-6">
          {items.map((it, i) => (
            it.heading ? (
              <li key={`${storageKey}-${i}`} className="font-semibold leading-[1.6]">{it.text}</li>
            ) : (
              <li key={`${storageKey}-${i}`} className="leading-[1.6]">{it.text}</li>
            )
          ))}
        </ul>
      )}

      {!capture ? (
        <div className="flex items-center justify-end gap-2">
          {hasBoxes ? (
            <Text
              variant="small"
              className="text-[color:var(--text-tertiary)] font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em]"
              role="status"
              aria-live="polite"
            >
              {done} / {config.items.length} complété{done > 1 ? "s" : ""}
            </Text>
          ) : null}
          <button onClick={() => setCapture((v) => !v)} className="btn btn-ghost text-xs">Mode capture</button>
        </div>
      ) : null}
    </section>
  );
}
