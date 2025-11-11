"use client";

import { useEffect, useState } from "react";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <section className={`space-y-3 ${capture ? '' : 'widget-surface p-5'}`}>
      {config.title ? (
        <h3 className="text-lg font-semibold">
          {allDone ? '✅ ' : ''}{config.title}
        </h3>
      ) : null}

      {hasBoxes ? (
        <ul className="space-y-2">
          {items.map((it, i) => (
            it.heading ? (
              <li key={`${storageKey}-${i}`} className="pt-3 text-[0.95rem] font-semibold text-slate-700">
                <span dangerouslySetInnerHTML={{ __html: it.text }} />
              </li>
            ) : (
              <li key={`${storageKey}-${i}`} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked[i]}
                  onChange={() => setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)))}
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-2"
                />
                <div className="text-[1.02rem] leading-[1.65]" dangerouslySetInnerHTML={{ __html: it.text }} />
              </li>
            )
          ))}
        </ul>
      ) : (
        <ul className="list-disc space-y-2 pl-6">
          {items.map((it, i) => (
            it.heading ? (
              <li key={`${storageKey}-${i}`} className="text-[1.02rem] font-semibold leading-[1.65]" dangerouslySetInnerHTML={{ __html: it.text }} />
            ) : (
              <li key={`${storageKey}-${i}`} className="text-[1.02rem] leading-[1.65]" dangerouslySetInnerHTML={{ __html: it.text }} />
            )
          ))}
        </ul>
      )}

      {!capture ? (
        <div className="flex items-center justify-end gap-2">
          {hasBoxes ? (
            <div className="text-xs text-slate-600">{done} / {config.items.length} complétés</div>
          ) : null}
          <button onClick={() => setCapture((v) => !v)} className="btn btn-ghost text-xs">Mode capture</button>
        </div>
      ) : null}
    </section>
  );
}
