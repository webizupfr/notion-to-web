"use client";

import { useEffect, useMemo, useState } from "react";
import type { InsightBoardWidgetConfig, InsightBoardColumn } from "@/lib/widget-parser";

type Row = { id: string; values: Record<string, string> };

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const STORAGE_PREFIX = "insight_board::";

export function InsightBoardWidget({ config, storageKey }: { config: InsightBoardWidgetConfig; storageKey: string }) {
  const columns: InsightBoardColumn[] = useMemo(() => config.columns ?? [], [config.columns]);
  const maxRows = Math.max(1, config.maxRows ?? 5);

  const [rows, setRows] = useState<Row[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${storageKey}`);
      const saved = raw ? (JSON.parse(raw) as Row[]) : null;
      if (saved && Array.isArray(saved) && saved.length) {
        setRows(saved);
        return;
      }
    } catch {
      /* ignore */
    }
    // default one empty row
    setRows([{ id: uid(), values: {} }]);
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, JSON.stringify(rows));
    } catch {
      /* ignore */
    }
  }, [rows, storageKey, mounted]);

  const updateValue = (rowId: string, columnId: string, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              values: {
                ...row.values,
                [columnId]: value,
              },
            }
          : row,
      ),
    );
  };

  const addRow = () => {
    if (rows.length >= maxRows) return;
    setRows((prev) => [{ id: uid(), values: {} }, ...prev]);
  };

  const removeRow = (rowId: string) => {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.id !== rowId)));
  };

  const columnSummaries = useMemo(() => {
    const accum = new Map<string, string[]>();
    for (const col of columns) accum.set(col.id, []);
    for (const row of rows) {
      for (const col of columns) {
        const value = (row.values[col.id] ?? "").trim();
        if (value) accum.get(col.id)?.push(value);
      }
    }
    return accum;
  }, [columns, rows]);

  const markdown = useMemo(() => {
    const blocks: string[] = [];
    for (const col of columns) {
      const items = columnSummaries.get(col.id) ?? [];
      if (!items.length) continue;
      blocks.push(`### ${col.label}`);
      for (const item of items) {
        blocks.push(`- ${item}`);
      }
      blocks.push("");
    }
    return blocks.join("\n").trim();
  }, [columns, columnSummaries]);

  const copyMarkdown = async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="widget-surface space-y-5 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {config.title ? <h3 className="text-lg font-semibold text-slate-800">{config.title}</h3> : null}
          {config.help ? <p className="mt-1 max-w-2xl text-sm text-slate-600">{config.help}</p> : null}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{rows.length}/{maxRows} entrées</span>
          <button
            type="button"
            onClick={copyMarkdown}
            disabled={!markdown}
            className="btn btn-ghost text-xs disabled:opacity-50"
            aria-disabled={!markdown}
          >
            Copier en Markdown
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {rows.map((row, idx) => (
          <article
            key={row.id}
            className="rounded-2xl border border-slate-200/70 bg-white/75 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between pb-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Insight #{rows.length - idx}
              </div>
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="text-xs text-slate-500 hover:text-slate-700"
                disabled={rows.length === 1}
              >
                Supprimer
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {columns.map((col) => (
                <label key={col.id} className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-slate-600">{col.label}</span>
                  <textarea
                    rows={3}
                    placeholder={col.placeholder}
                    value={row.values[col.id] ?? ""}
                    onChange={(event) => updateValue(row.id, col.id, event.target.value)}
                    className="min-h-[96px] resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  />
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <div>
          Synthétisez 3 à 5 apprentissages clairs. Ajoutez une ligne par insight marquant.
        </div>
        <button
          type="button"
          onClick={addRow}
          className="btn btn-primary text-xs"
          disabled={rows.length >= maxRows}
        >
          ➕ Ajouter un apprentissage
        </button>
      </div>
    </section>
  );
}

