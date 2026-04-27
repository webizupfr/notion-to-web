"use client";

import { useEffect, useMemo, useState } from "react";
import type { InsightBoardWidgetConfig, InsightBoardColumn } from "@/lib/widget-parser";
import { useCopy, copyFeedbackLabel } from "./useCopy";

type Row = { id: string; values: Record<string, string> };

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const STORAGE_PREFIX = "insight_board::";

export function InsightBoardWidget({
  config,
  storageKey,
}: {
  config: InsightBoardWidgetConfig;
  storageKey: string;
}) {
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
    } catch { /* ignore */ }
    setRows([{ id: uid(), values: {} }]);
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${storageKey}`, JSON.stringify(rows));
    } catch { /* ignore */ }
  }, [rows, storageKey, mounted]);

  const updateValue = (rowId: string, columnId: string, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? { ...row, values: { ...row.values, [columnId]: value } }
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
      for (const item of items) blocks.push(`- ${item}`);
      blocks.push("");
    }
    return blocks.join("\n").trim();
  }, [columns, columnSummaries]);

  const { copy, status: copyStatus } = useCopy();
  const handleCopy = () => copy(markdown);

  if (!columns.length) {
    return (
      <section className="widget-shell">
        <p className="m-0 text-sm text-[color:var(--text-tertiary)]">Aucune colonne configurée.</p>
      </section>
    );
  }

  return (
    <section className="widget-shell">
      <div className="widget-header">
        {config.title ? <h3 className="widget-header__title">{config.title}</h3> : null}
        {config.help ? <p className="widget-header__desc">{config.help}</p> : null}
      </div>

      <div className="space-y-[var(--space-md)]" aria-live="polite">
        {rows.map((row, idx) => (
          <article
            key={row.id}
            className="rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] p-[var(--space-md)]"
          >
            <div className="flex items-center justify-between pb-[var(--space-sm)]">
              <div className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                Insight #{String(rows.length - idx).padStart(2, "0")}
              </div>
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="rounded-[var(--r-s)] px-2 py-[2px] font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)] transition-colors hover:text-[color:var(--signal-danger)] disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={rows.length === 1}
                aria-disabled={rows.length === 1}
              >
                Suppr.
              </button>
            </div>

            <div className="grid gap-[var(--space-sm)] md:grid-cols-3">
              {columns.map((col) => (
                <label key={col.id} className="flex flex-col gap-1 min-w-0">
                  <span className="widget-label">{col.label}</span>
                  <textarea
                    rows={3}
                    placeholder={col.placeholder}
                    value={row.values[col.id] ?? ""}
                    onChange={(event) => updateValue(row.id, col.id, event.target.value)}
                    className="min-h-[96px] resize-y"
                  />
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="widget-actions">
        <span
          className="mr-auto font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
          role="status"
          aria-live="polite"
        >
          {copyFeedbackLabel(copyStatus) || `${rows.length}/${maxRows} entrée${rows.length > 1 ? "s" : ""}`}
        </span>
        <button
          type="button"
          onClick={addRow}
          className="btn btn-primary text-xs"
          disabled={rows.length >= maxRows}
          aria-disabled={rows.length >= maxRows}
        >
          + Ajouter
        </button>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!markdown}
          className="btn btn-ghost text-xs"
          aria-disabled={!markdown}
        >
          Copier en Markdown
        </button>
      </div>
    </section>
  );
}
