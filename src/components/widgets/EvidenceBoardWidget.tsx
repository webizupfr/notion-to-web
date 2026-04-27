"use client";

import { useEffect, useMemo, useState } from "react";
import type { EvidenceBoardWidgetConfig } from "@/lib/widget-parser";
import { useCopy, copyFeedbackLabel } from "./useCopy";

type Item = { id: string; text: string; col: string };

function uid() { return Math.random().toString(36).slice(2, 9); }

export function EvidenceBoardWidget({ config, storageKey }: { config: EvidenceBoardWidgetConfig; storageKey: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState("");
  const [col, setCol] = useState(config.columns[0]?.id ?? "");

  useEffect(() => {
    try { const raw = localStorage.getItem(`evidence_board::${storageKey}`); if (raw) setItems(JSON.parse(raw)); } catch {}
  }, [storageKey]);

  useEffect(() => { try { localStorage.setItem(`evidence_board::${storageKey}`, JSON.stringify(items)); } catch {} }, [items, storageKey]);

  const byCol = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const c of config.columns) m.set(c.id, []);
    for (const it of items) (m.get(it.col) ?? []).push(it);
    return m;
  }, [items, config.columns]);

  const add = () => {
    const t = text.trim(); if (!t) return; setItems((prev) => [{ id: uid(), text: t, col }, ...prev]); setText("");
  };
  const remove = (id: string) => setItems((prev) => prev.filter((x) => x.id !== id));
  // Intentionally no move after add — keeps evidence stable per consigne

  const md = useMemo(() => {
    const lines: string[] = []; lines.push(`# Tri des données`);
    for (const c of config.columns) {
      lines.push(`\n## ${c.label}`);
      for (const it of (byCol.get(c.id) ?? [])) lines.push(`- ${it.text}`);
    }
    return lines.join("\n");
  }, [byCol, config.columns]);

  const { copy, status: copyStatus } = useCopy();
  const handleCopy = () => copy(md);

  const totalItems = items.length;

  return (
    <section className="widget-shell">
      <div className="grid gap-[var(--space-sm)] items-start md:grid-cols-[1fr_auto]">
        <input
          value={text}
          onChange={(e)=>setText(e.target.value)}
          placeholder="Écris un verbatim / observation… (⌘+Entrée pour ajouter)"
          onKeyDown={(e)=>{ if(e.key==='Enter' && (e.metaKey||e.ctrlKey)) add(); }}
          aria-label="Nouveau verbatim"
        />
        <div className="grid gap-[var(--space-sm)] w-full md:w-auto md:grid-cols-[auto_auto]">
          <select value={col} onChange={(e)=>setCol(e.target.value)} aria-label="Colonne de destination">
            {config.columns.map((c)=> (<option key={c.id} value={c.id}>{c.label}</option>))}
          </select>
          <button onClick={add} className="btn btn-primary text-xs w-full md:w-auto" disabled={!text.trim()} aria-disabled={!text.trim()}>
            Ajouter
          </button>
        </div>
      </div>

      <div
        className="grid gap-[var(--space-md)]"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
        aria-live="polite"
      >
        {config.columns.map((c) => {
          const colItems = byCol.get(c.id) ?? [];
          return (
            <div key={c.id} className="space-y-2 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-sm font-semibold text-[color:var(--text-primary)]">{c.label}</div>
                <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                  {String(colItems.length).padStart(2, "0")}
                </span>
              </div>
              {c.help ? <div className="text-xs text-[color:var(--text-tertiary)]">{c.help}</div> : null}
              {colItems.length === 0 ? (
                <div className="rounded-[var(--r-s)] border border-dashed border-[color:var(--border-subtle)] px-3 py-2 text-xs text-[color:var(--text-tertiary)] italic">
                  Rien encore
                </div>
              ) : null}
              <ul className="space-y-2">
                {colItems.map((it) => (
                  <li
                    key={it.id}
                    className="rounded-[var(--r-s)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] px-3 py-2 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 whitespace-pre-wrap break-words text-[color:var(--text-primary)]">
                        {it.text}
                      </div>
                      <button
                        onClick={()=>remove(it.id)}
                        className="rounded-[var(--r-s)] border border-transparent px-2 py-[2px] text-[11px] font-[family-name:var(--font-mono)] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)] transition-colors hover:border-[color:var(--signal-danger)] hover:text-[color:var(--signal-danger)]"
                        aria-label={`Supprimer: ${it.text.slice(0, 40)}`}
                      >
                        Suppr.
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="widget-actions">
        <span
          className="mr-auto font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
          role="status"
          aria-live="polite"
        >
          {copyFeedbackLabel(copyStatus) || `${String(totalItems).padStart(2, "0")} élément${totalItems > 1 ? "s" : ""}`}
        </span>
        <button onClick={handleCopy} className="btn btn-ghost text-xs" disabled={totalItems === 0} aria-disabled={totalItems === 0}>
          Copier en Markdown
        </button>
      </div>
    </section>
  );
}
