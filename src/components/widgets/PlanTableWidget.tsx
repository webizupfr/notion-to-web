"use client";

import { useEffect, useMemo, useState } from "react";
import { Heading } from "@/components/ui/Heading";
import type { PlanTableWidgetConfig } from "@/lib/widget-parser";
import { useCopy, copyFeedbackLabel } from "./useCopy";

export function PlanTableWidget({
  config,
  storageKey,
}: {
  config: PlanTableWidgetConfig;
  storageKey: string;
}) {
  const [values, setValues] = useState<string[]>(() => config.rows.map(() => ""));
  const [capture, setCapture] = useState(false);
  const scope = useMemo(() => storageKey.split("::")[0], [storageKey]);
  const storeKey = useMemo(
    () =>
      config.alias
        ? `plan_table::${scope}::${config.alias}`
        : `plan_table::${storageKey}`,
    [config.alias, scope, storageKey],
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storeKey);
      const arr = saved ? (JSON.parse(saved) as string[]) : null;
      if (Array.isArray(arr) && arr.length === config.rows.length) setValues(arr);
    } catch { /* ignore */ }
  }, [config.rows.length, storeKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storeKey, JSON.stringify(values));
    } catch { /* ignore */ }
  }, [values, storeKey]);

  const setVal = (idx: number, v: string) =>
    setValues((prev) => prev.map((x, i) => (i === idx ? v : x)));

  const plan = useMemo(
    () =>
      config.rows
        .map((r, i) => `• ${r.title}\n   - ${r.info ?? ""}\n   → ${values[i] || "(à compléter)"}`)
        .join("\n\n"),
    [config.rows, values],
  );

  const { copy, status: copyStatus } = useCopy();
  const handleCopy = () => copy(plan);

  const filled = values.filter((v) => v.trim()).length;

  if (!config.rows.length) {
    return (
      <section className="widget-shell">
        <p className="m-0 text-sm text-[color:var(--text-tertiary)]">Aucune ligne configurée.</p>
      </section>
    );
  }

  return (
    <section className="widget-shell">
      {config.title ? (
        <div className="widget-header">
          <h3 className="widget-header__title">{config.title}</h3>
        </div>
      ) : null}

      {/* Desktop: table ; Mobile: stack */}
      <div className="hidden md:block overflow-hidden rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]">
        <table className="w-full text-[0.95rem]" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: "22%" }} />
            <col style={{ width: "38%" }} />
            <col style={{ width: "40%" }} />
          </colgroup>
          <thead className="bg-[color:var(--surface-2)]">
            <tr>
              <th className="px-[var(--space-md)] py-[var(--space-sm)] text-left font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                Étape
              </th>
              <th className="px-[var(--space-md)] py-[var(--space-sm)] text-left font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                À définir
              </th>
              <th className="px-[var(--space-md)] py-[var(--space-sm)] text-left font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                Ton contenu
              </th>
            </tr>
          </thead>
          <tbody>
            {config.rows.map((row, i) => (
              <tr
                key={`${storageKey}-${i}`}
                className={`border-t border-[color:var(--border-subtle)] ${i % 2 === 1 ? "bg-[color:var(--surface-1)]" : ""}`}
              >
                <td className="px-[var(--space-md)] py-[var(--space-md)] align-top font-semibold text-[color:var(--text-primary)]">
                  {row.title}
                </td>
                <td className="px-[var(--space-md)] py-[var(--space-md)] align-top text-[color:var(--text-secondary)]">
                  {row.info}
                </td>
                <td className="px-[var(--space-md)] py-[var(--space-md)] align-top">
                  {capture ? (
                    <div className="min-h-[2.5rem] whitespace-pre-wrap text-[1rem] leading-[1.55]">
                      {values[i] && values[i].trim() ? values[i] : (row.placeholder ?? "—")}
                    </div>
                  ) : row.multiline !== false ? (
                    <textarea
                      value={values[i]}
                      onChange={(e) => setVal(i, e.target.value)}
                      placeholder={row.placeholder}
                      rows={3}
                      aria-label={row.title}
                    />
                  ) : (
                    <input
                      value={values[i]}
                      onChange={(e) => setVal(i, e.target.value)}
                      placeholder={row.placeholder}
                      aria-label={row.title}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stack */}
      <div className="md:hidden space-y-[var(--space-sm)]">
        {config.rows.map((row, i) => (
          <div
            key={`m-${storageKey}-${i}`}
            className="rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] p-[var(--space-md)] space-y-2"
          >
            <Heading level={3} className="text-[1rem]">{row.title}</Heading>
            {row.info ? (
              <p className="m-0 text-sm text-[color:var(--text-secondary)]">{row.info}</p>
            ) : null}
            {capture ? (
              <div className="whitespace-pre-wrap text-[0.95rem] leading-[1.55]">
                {values[i] && values[i].trim() ? values[i] : (row.placeholder ?? "—")}
              </div>
            ) : row.multiline !== false ? (
              <textarea
                value={values[i]}
                onChange={(e) => setVal(i, e.target.value)}
                placeholder={row.placeholder}
                rows={3}
                aria-label={row.title}
              />
            ) : (
              <input
                value={values[i]}
                onChange={(e) => setVal(i, e.target.value)}
                placeholder={row.placeholder}
                aria-label={row.title}
              />
            )}
          </div>
        ))}
      </div>

      <div className="widget-actions">
        <span
          className="mr-auto font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
          role="status"
          aria-live="polite"
        >
          {copyFeedbackLabel(copyStatus) || `${filled}/${config.rows.length} complété${filled > 1 ? "s" : ""}`}
        </span>
        <button onClick={() => setCapture((v) => !v)} className="btn btn-ghost text-xs">
          {capture ? "Quitter capture" : "Mode capture"}
        </button>
        <button onClick={handleCopy} className="btn btn-primary text-xs">
          Copier le plan
        </button>
      </div>
    </section>
  );
}
