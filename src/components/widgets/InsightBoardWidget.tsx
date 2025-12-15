"use client";

import { useEffect, useMemo, useState } from "react";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
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
    <section className="surface-card space-y-[var(--space-m)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {config.title ? <Heading level={3} className="text-[1.12rem] leading-[1.35] text-[color:var(--fg)]">{config.title}</Heading> : null}
          {config.help ? <Text variant="small" className="mt-1 max-w-2xl text-[color:var(--muted)]">{config.help}</Text> : null}
        </div>
        <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
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
            className="rounded-[var(--r-xl)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] p-[var(--space-4)] shadow-sm"
          >
            <div className="flex items-center justify-between pb-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                Insight #{rows.length - idx}
              </div>
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="text-xs text-[color:var(--muted)] hover:text-[color:var(--fg)]"
                disabled={rows.length === 1}
              >
                Supprimer
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {columns.map((col) => (
                <label key={col.id} className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-[color:var(--muted)]">{col.label}</span>
                  <textarea
                    rows={3}
                    placeholder={col.placeholder}
                    value={row.values[col.id] ?? ""}
                    onChange={(event) => updateValue(row.id, col.id, event.target.value)}
                    className="min-h-[96px] resize-y rounded-[var(--r-lg)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] px-[var(--space-3)] py-[var(--space-2)] text-sm text-[color:var(--fg)] shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--primary)_28%,transparent)]"
                  />
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
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
