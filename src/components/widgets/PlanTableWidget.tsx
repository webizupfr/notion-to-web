"use client";

import { useEffect, useMemo, useState } from "react";
import { Heading } from "@/components/ui/Heading";
import type { PlanTableWidgetConfig } from "@/lib/widget-parser";

export function PlanTableWidget({ config, storageKey }: { config: PlanTableWidgetConfig; storageKey: string }) {
  const [values, setValues] = useState<string[]>(() => config.rows.map(() => ""));
  const [capture, setCapture] = useState(false);
  // Key scoping: allow shared alias so other widgets can read
  const scope = useMemo(() => storageKey.split('::')[0], [storageKey]);
  const storeKey = useMemo(() => (config.alias ? `plan_table::${scope}::${config.alias}` : `plan_table::${storageKey}`), [config.alias, scope, storageKey]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storeKey);
      const arr = saved ? (JSON.parse(saved) as string[]) : null;
      if (Array.isArray(arr) && arr.length === config.rows.length) setValues(arr);
    } catch {}
  }, [config.rows.length, storeKey]);

  useEffect(() => {
    try { localStorage.setItem(storeKey, JSON.stringify(values)); } catch {}
  }, [values, storeKey]);

  const setVal = (idx: number, v: string) => setValues((prev) => prev.map((x, i) => (i === idx ? v : x)));

  const copy = async () => {
    const out = config.rows
      .map((r, i) => `• ${r.title}\n   - ${r.info ?? ""}\n   → ${values[i] || "(à compléter)"}`)
      .join("\n\n");
    try { await navigator.clipboard.writeText(out); } catch {}
  };

  return (
    <section className="surface-card space-y-[var(--space-m)]">
      {config.title ? <Heading level={3}>{config.title}</Heading> : null}
      <div className="overflow-hidden rounded-[var(--r-l)] border border-[color:var(--border)] bg-[color:var(--bg-soft)] shadow-[var(--shadow-s)]">
        <table className="w-full text-[0.98rem]" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '22%' }} />
            <col style={{ width: '38%' }} />
            <col style={{ width: '40%' }} />
          </colgroup>
          <thead className="bg-[color-mix(in_srgb,var(--bg-soft)_90%,white_10%)]">
            <tr>
              <th className="px-[var(--space-4)] py-[var(--space-3)] text-left font-semibold text-[color:var(--fg)]">Étape</th>
              <th className="px-[var(--space-4)] py-[var(--space-3)] text-left font-semibold text-[color:var(--fg)]">Ce que tu dois définir</th>
              <th className="px-[var(--space-4)] py-[var(--space-3)] text-left font-semibold text-[color:var(--fg)]">Ton contenu</th>
            </tr>
          </thead>
          <tbody>
            {config.rows.map((row, i) => (
              <tr key={`${storageKey}-${i}`} className={i % 2 === 1 ? "bg-[color-mix(in_srgb,var(--bg-soft)_94%,white_6%)]" : undefined}>
                <td className="px-[var(--space-4)] py-[var(--space-4)] align-top font-semibold text-[color:var(--fg)]">{row.title}</td>
                <td className="px-[var(--space-4)] py-[var(--space-4)] align-top text-[color:var(--fg)]">
                  {row.info}
                </td>
                <td className="px-[var(--space-4)] py-[var(--space-4)] align-top">
                  {capture ? (
                    <div className="min-h-[2.5rem] whitespace-pre-wrap text-[1.02rem] leading-[1.6]">
                      {values[i] && values[i].trim() ? values[i] : (row.placeholder ?? "—")}
                    </div>
                  ) : row.multiline !== false ? (
                    <textarea
                      value={values[i]}
                      onChange={(e) => setVal(i, e.target.value)}
                      placeholder={row.placeholder}
                      rows={3}
                      className="w-full rounded-[var(--r-md)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] px-[var(--space-3)] py-[var(--space-2)] text-sm text-[color:var(--fg)] shadow-sm focus:border-[color-mix(in_oklab,var(--primary)_50%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--primary)_22%,transparent)]"
                    />
                  ) : (
                    <input
                      value={values[i]}
                      onChange={(e) => setVal(i, e.target.value)}
                      placeholder={row.placeholder}
                      className="w-full rounded-[var(--r-md)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] px-[var(--space-3)] py-[var(--space-2)] text-sm text-[color:var(--fg)] shadow-sm focus:border-[color-mix(in_oklab,var(--primary)_50%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--primary)_22%,transparent)]"
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-[var(--space-s)]">
        <button onClick={() => setCapture((v) => !v)} className="btn btn-ghost text-xs">{capture ? 'Quitter le mode capture' : 'Mode capture'}</button>
        <button onClick={copy} className="btn btn-primary text-xs">Copier le plan</button>
      </div>
    </section>
  );
}
