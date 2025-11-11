"use client";

import { useEffect, useMemo, useState } from "react";
import type { TimeCalcWidgetConfig } from "@/lib/widget-parser";

type Row = { id: string; name: string; minutes: string; times: string };

function asNumber(v: string): number {
  const n = Number(v.replace(/,/g, '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function TimeCalcWidget({ config, storageKey }: { config: TimeCalcWidgetConfig; storageKey: string }) {
  const [rows, setRows] = useState<Row[]>([ { id: crypto.randomUUID(), name: "", minutes: "", times: "" } ]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`time_calc::${storageKey}`);
      if (saved) {
        const parsed = JSON.parse(saved) as Row[];
        if (Array.isArray(parsed) && parsed.length) setRows(parsed);
      }
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try { localStorage.setItem(`time_calc::${storageKey}`, JSON.stringify(rows)); } catch {}
  }, [rows, storageKey]);

  const weeklyMinutes = useMemo(() => rows.reduce((acc, r) => acc + asNumber(r.minutes) * asNumber(r.times), 0), [rows]);
  const weeklyHours = weeklyMinutes / 60;
  const monthlyHours = weeklyHours * (config.weeksPerMonth ?? 4.3);
  const value = config.hourlyRate ? monthlyHours * config.hourlyRate : null;

  const addRow = () => setRows((r) => [...r, { id: crypto.randomUUID(), name: "", minutes: "", times: "" }]);
  const removeRow = (id: string) => setRows((r) => (r.length > 1 ? r.filter((x) => x.id !== id) : r));
  const update = (id: string, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const reset = () => setRows([{ id: crypto.randomUUID(), name: "", minutes: "", times: "" }]);

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <section className="widget-surface p-5 space-y-4">
      {config.title ? <h3 className="text-lg font-semibold">{config.title}</h3> : <h3 className="text-lg font-semibold">Calculateur d’économies de temps</h3>}
      {config.description ? <p className="text-sm text-slate-600">{config.description}</p> : null}

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-[0.98rem]">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Nom de la tâche</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Temps / exécution (min)</th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">Fréquence / semaine</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">
                  <input
                    value={row.name}
                    onChange={(e) => update(row.id, { name: e.target.value })}
                    placeholder="ex: Reporting hebdo"
                    className="w-full rounded-lg border bg-white/80 px-3 py-2 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={row.minutes}
                    onChange={(e) => update(row.id, { minutes: e.target.value })}
                    placeholder="ex: 20"
                    inputMode="numeric"
                    className="w-32 rounded-lg border bg-white/80 px-3 py-2 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={row.times}
                    onChange={(e) => update(row.id, { times: e.target.value })}
                    placeholder="ex: 3"
                    inputMode="numeric"
                    className="w-24 rounded-lg border bg-white/80 px-3 py-2 text-sm"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => removeRow(row.id)} className="btn btn-ghost text-xs">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={addRow} className="btn btn-ghost text-xs">Ajouter une tâche</button>
        <button onClick={reset} className="btn btn-ghost text-xs">Réinitialiser</button>
      </div>

      <div className="rounded-xl border bg-white/60 p-4 text-sm">
        <p><strong>Temps hebdo total :</strong> {fmt(weeklyMinutes)} min = {fmt(weeklyHours)} h/semaine</p>
        <p><strong>Temps économisé par mois :</strong> ~{fmt(monthlyHours)} h/mois</p>
        {value !== null ? (
          <p><strong>Valeur mensuelle estimée :</strong> {(config.currency ?? '€')}{fmt(value)}</p>
        ) : null}
      </div>
    </section>
  );
}
