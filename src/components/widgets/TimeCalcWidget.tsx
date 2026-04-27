"use client";

import { useEffect, useMemo, useState } from "react";
import type { TimeCalcWidgetConfig } from "@/lib/widget-parser";

type Row = { id: string; name: string; minutes: string; times: string };

function asNumber(v: string): number {
  const n = Number(v.replace(/,/g, "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function uid() {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2, 9);
  }
}

export function TimeCalcWidget({
  config,
  storageKey,
}: {
  config: TimeCalcWidgetConfig;
  storageKey: string;
}) {
  const [rows, setRows] = useState<Row[]>([
    { id: uid(), name: "", minutes: "", times: "" },
  ]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`time_calc::${storageKey}`);
      if (saved) {
        const parsed = JSON.parse(saved) as Row[];
        if (Array.isArray(parsed) && parsed.length) setRows(parsed);
      }
    } catch { /* ignore */ }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(`time_calc::${storageKey}`, JSON.stringify(rows));
    } catch { /* ignore */ }
  }, [rows, storageKey]);

  const weeklyMinutes = useMemo(
    () => rows.reduce((acc, r) => acc + asNumber(r.minutes) * asNumber(r.times), 0),
    [rows],
  );
  const weeklyHours = weeklyMinutes / 60;
  const monthlyHours = weeklyHours * (config.weeksPerMonth ?? 4.3);
  const value = config.hourlyRate ? monthlyHours * config.hourlyRate : null;

  const addRow = () =>
    setRows((r) => [...r, { id: uid(), name: "", minutes: "", times: "" }]);
  const removeRow = (id: string) =>
    setRows((r) => (r.length > 1 ? r.filter((x) => x.id !== id) : r));
  const update = (id: string, patch: Partial<Row>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const reset = () => setRows([{ id: uid(), name: "", minutes: "", times: "" }]);

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <section className="widget-shell">
      <div className="widget-header">
        <h3 className="widget-header__title">
          {config.title ?? "Calculateur d'économies de temps"}
        </h3>
        {config.description ? (
          <p className="widget-header__desc">{config.description}</p>
        ) : null}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-hidden rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]">
        <table className="w-full text-[0.95rem]">
          <thead className="bg-[color:var(--surface-2)]">
            <tr>
              <th className="px-[var(--space-md)] py-[var(--space-sm)] text-left font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                Tâche
              </th>
              <th className="px-[var(--space-md)] py-[var(--space-sm)] text-left font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                Min / exec
              </th>
              <th className="px-[var(--space-md)] py-[var(--space-sm)] text-left font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                × / semaine
              </th>
              <th className="px-[var(--space-md)] py-[var(--space-sm)]" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-t border-[color:var(--border-subtle)]"
              >
                <td className="px-[var(--space-md)] py-[var(--space-sm)]">
                  <input
                    value={row.name}
                    onChange={(e) => update(row.id, { name: e.target.value })}
                    placeholder="Ex: Reporting hebdo"
                    aria-label="Nom de la tâche"
                  />
                </td>
                <td className="px-[var(--space-md)] py-[var(--space-sm)]">
                  <input
                    value={row.minutes}
                    onChange={(e) => update(row.id, { minutes: e.target.value })}
                    placeholder="20"
                    inputMode="decimal"
                    className="w-24"
                    aria-label="Minutes par exécution"
                  />
                </td>
                <td className="px-[var(--space-md)] py-[var(--space-sm)]">
                  <input
                    value={row.times}
                    onChange={(e) => update(row.id, { times: e.target.value })}
                    placeholder="3"
                    inputMode="decimal"
                    className="w-20"
                    aria-label="Fréquence par semaine"
                  />
                </td>
                <td className="px-[var(--space-md)] py-[var(--space-sm)] text-right">
                  <button
                    onClick={() => removeRow(row.id)}
                    className="btn btn-ghost text-xs"
                    disabled={rows.length === 1}
                    aria-disabled={rows.length === 1}
                    aria-label="Supprimer la ligne"
                  >
                    Suppr.
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stack */}
      <div className="md:hidden space-y-[var(--space-sm)]">
        {rows.map((row, idx) => (
          <div
            key={`m-${row.id}`}
            className="rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] p-[var(--space-md)] space-y-[var(--space-xs)]"
          >
            <div className="flex items-center justify-between">
              <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                Tâche #{idx + 1}
              </span>
              <button
                onClick={() => removeRow(row.id)}
                className="btn btn-ghost text-xs"
                disabled={rows.length === 1}
                aria-disabled={rows.length === 1}
              >
                Suppr.
              </button>
            </div>
            <input
              value={row.name}
              onChange={(e) => update(row.id, { name: e.target.value })}
              placeholder="Nom de la tâche"
            />
            <div className="grid grid-cols-2 gap-[var(--space-xs)]">
              <input
                value={row.minutes}
                onChange={(e) => update(row.id, { minutes: e.target.value })}
                placeholder="Minutes"
                inputMode="decimal"
              />
              <input
                value={row.times}
                onChange={(e) => update(row.id, { times: e.target.value })}
                placeholder="× / sem."
                inputMode="decimal"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="widget-actions">
        <button onClick={addRow} className="btn btn-ghost text-xs">
          + Ajouter
        </button>
        <button onClick={reset} className="btn btn-ghost text-xs">
          Réinitialiser
        </button>
      </div>

      <div
        className="widget-preview"
        role="status"
        aria-live="polite"
      >
        <span className="widget-preview__label">Estimation</span>
        <div className="space-y-1 text-[0.95rem] leading-[1.6] text-[color:var(--text-primary)]">
          <p className="m-0">
            <strong>Hebdo :</strong> {fmt(weeklyMinutes)} min = {fmt(weeklyHours)} h / semaine
          </p>
          <p className="m-0">
            <strong>Mensuel :</strong> ~{fmt(monthlyHours)} h / mois
          </p>
          {value !== null ? (
            <p className="m-0">
              <strong>Valeur :</strong> {(config.currency ?? "€")}
              {fmt(value)} / mois
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
