"use client";

import { useEffect, useMemo, useState } from "react";
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
    <section className="widget-surface p-5 space-y-4">
      {config.title ? <h3 className="text-lg font-semibold">{config.title}</h3> : null}
      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-[0.98rem]" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '22%' }} />
            <col style={{ width: '38%' }} />
            <col style={{ width: '40%' }} />
          </colgroup>
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Étape</th>
              <th className="px-4 py-3 text-left font-semibold">Ce que tu dois définir</th>
              <th className="px-4 py-3 text-left font-semibold">Ton contenu</th>
            </tr>
          </thead>
          <tbody>
            {config.rows.map((row, i) => (
              <tr key={`${storageKey}-${i}`} className={i % 2 === 1 ? "bg-amber-50/40" : undefined}>
                <td className="px-4 py-4 align-top font-semibold">{row.title}</td>
                <td className="px-4 py-4 align-top text-slate-700">
                  {row.info}
                </td>
                <td className="px-4 py-4 align-top">
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
                      className="w-full rounded-lg border bg-white/85 px-3 py-2 text-sm"
                    />
                  ) : (
                    <input
                      value={values[i]}
                      onChange={(e) => setVal(i, e.target.value)}
                      placeholder={row.placeholder}
                      className="w-full rounded-lg border bg-white/85 px-3 py-2 text-sm"
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="widget-actions">
        <button onClick={() => setCapture((v) => !v)} className="btn btn-ghost text-xs">{capture ? 'Quitter le mode capture' : 'Mode capture'}</button>
        <button onClick={copy} className="btn btn-primary text-xs">Copier le plan</button>
      </div>
    </section>
  );
}
