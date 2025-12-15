"use client";

import { useEffect, useMemo, useState } from "react";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
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
    <section className="surface-card space-y-[var(--space-m)]">
      {config.title ? (
        <Heading level={3} className="text-[1.12rem] leading-[1.3]">{config.title}</Heading>
      ) : (
        <Heading level={3} className="text-[1.12rem] leading-[1.3]">Calculateur d’économies de temps</Heading>
      )}
      {config.description ? <Text variant="small" className="text-[color:var(--muted)]">{config.description}</Text> : null}

      <div className="overflow-hidden rounded-[var(--r-lg)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_96%,#fff)] shadow-sm">
        <table className="w-full text-[0.98rem]">
          <thead className="bg-[color-mix(in_oklab,var(--bg)_90%,#fff)]">
            <tr>
              <th className="px-[var(--space-3)] py-[var(--space-2)] text-left font-semibold text-[color:var(--fg)]">Nom de la tâche</th>
              <th className="px-[var(--space-3)] py-[var(--space-2)] text-left font-semibold text-[color:var(--fg)]">Temps / exécution (min)</th>
              <th className="px-[var(--space-3)] py-[var(--space-2)] text-left font-semibold text-[color:var(--fg)]">Fréquence / semaine</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[color:var(--border)]">
                <td className="px-[var(--space-3)] py-[var(--space-2)]">
                  <input
                    value={row.name}
                    onChange={(e) => update(row.id, { name: e.target.value })}
                    placeholder="ex: Reporting hebdo"
                    className="w-full rounded-[var(--r-md)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] px-[var(--space-3)] py-[var(--space-2)] text-sm text-[color:var(--fg)] shadow-sm focus:border-[color-mix(in_oklab,var(--primary)_50%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--primary)_22%,transparent)]"
                  />
                </td>
                <td className="px-[var(--space-3)] py-[var(--space-2)]">
                  <input
                    value={row.minutes}
                    onChange={(e) => update(row.id, { minutes: e.target.value })}
                    placeholder="ex: 20"
                    inputMode="numeric"
                    className="w-32 rounded-[var(--r-md)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] px-[var(--space-3)] py-[var(--space-2)] text-sm text-[color:var(--fg)] shadow-sm focus:border-[color-mix(in_oklab,var(--primary)_50%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--primary)_22%,transparent)]"
                  />
                </td>
                <td className="px-[var(--space-3)] py-[var(--space-2)]">
                  <input
                    value={row.times}
                    onChange={(e) => update(row.id, { times: e.target.value })}
                    placeholder="ex: 3"
                    inputMode="numeric"
                    className="w-24 rounded-[var(--r-md)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] px-[var(--space-3)] py-[var(--space-2)] text-sm text-[color:var(--fg)] shadow-sm focus:border-[color-mix(in_oklab,var(--primary)_50%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--primary)_22%,transparent)]"
                  />
                </td>
                <td className="px-[var(--space-3)] py-[var(--space-2)] text-right">
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

      <div className="rounded-[var(--r-lg)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_92%,#fff)] p-[var(--space-4)] text-sm text-[color:var(--fg)] shadow-sm">
        <Text variant="small"><strong>Temps hebdo total :</strong> {fmt(weeklyMinutes)} min = {fmt(weeklyHours)} h/semaine</Text>
        <Text variant="small"><strong>Temps économisé par mois :</strong> ~{fmt(monthlyHours)} h/mois</Text>
        {value !== null ? (
          <Text variant="small"><strong>Valeur mensuelle estimée :</strong> {(config.currency ?? '€')}{fmt(value)}</Text>
        ) : null}
      </div>
    </section>
  );
}
