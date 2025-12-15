"use client";

import { useEffect, useMemo, useState } from "react";
import type { EvidenceBoardWidgetConfig } from "@/lib/widget-parser";

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

  const copy = async () => { try { await navigator.clipboard.writeText(md); } catch {} };

  return (
    <section className="surface-card w-full space-y-[var(--space-m)]">
      <div className="grid gap-[var(--space-s)] items-start md:grid-cols-[1fr_auto]">
        <input
          value={text}
          onChange={(e)=>setText(e.target.value)}
          placeholder="Écris un verbatim/observation…"
          className="w-full min-w-0 rounded-[var(--r-m)] border border-[color:var(--border)] bg-[color:var(--bg-card)] px-[var(--space-3)] py-[var(--space-2)] text-sm text-[color:var(--fg)] shadow-sm focus:border-[color-mix(in_oklab,var(--primary)_50%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--primary)_22%,transparent)]"
          onKeyDown={(e)=>{ if(e.key==='Enter' && (e.metaKey||e.ctrlKey)) add(); }}
        />
        <div className="grid gap-[var(--space-s)] w-full md:w-auto md:grid-cols-[auto_auto]">
          <select value={col} onChange={(e)=>setCol(e.target.value)} className="rounded-[var(--r-m)] border border-[color:var(--border)] bg-[color:var(--bg-card)] px-[var(--space-2)] py-[var(--space-2)] text-sm text-[color:var(--fg)] shadow-sm w-full md:w-auto focus:border-[color-mix(in_oklab,var(--primary)_50%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--primary)_22%,transparent)]">
            {config.columns.map((c)=> (<option key={c.id} value={c.id}>{c.label}</option>))}
          </select>
          <button onClick={add} className="btn btn-primary text-xs w-full md:w-auto">Ajouter</button>
        </div>
      </div>

      <div className="grid gap-[var(--space-m)]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {config.columns.map((c) => (
          <div key={c.id} className="space-y-2 min-w-0">
            <div className="text-sm font-semibold text-[color:var(--fg)]">{c.label}</div>
            {c.help ? <div className="text-xs text-[color:var(--fg-muted)]">{c.help}</div> : null}
            <ul className="space-y-2">
              {(byCol.get(c.id) ?? []).map((it) => (
                <li key={it.id} className="surface-panel text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 whitespace-pre-wrap break-words">{it.text}</div>
                    <div className="flex items-center gap-1 text-xs">
                      <button onClick={()=>remove(it.id)} className="rounded-md border border-[color:var(--border)] px-[var(--space-2)] py-[var(--space-1)] hover:border-[color-mix(in_oklab,var(--danger)_40%,transparent)]">
                        Suppr.
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex justify-end text-xs">
        <button onClick={copy} className="btn btn-ghost text-xs">Copier en Markdown</button>
      </div>
    </section>
  );
}
