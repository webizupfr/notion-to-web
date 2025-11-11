"use client";

import { useEffect, useMemo, useState } from "react";
import type { PatternBuilderWidgetConfig, PatternField } from "@/lib/widget-parser";

type Row = Record<string, string> & { id: string };

function uid() { return Math.random().toString(36).slice(2, 9); }

export function PatternBuilderWidget({ config, storageKey }: { config: PatternBuilderWidgetConfig; storageKey: string }) {
  const fields: PatternField[] = useMemo(() => config.fields ?? [
    { id: 'symptome', label: 'Symptôme (Observation)', type: 'textarea', placeholder: 'Verbatim exact / comportement observé' },
    { id: 'cause', label: 'Cause possible (Ce que ça montre)', type: 'textarea', placeholder: 'Besoin/tension/opportunité derrière le symptôme' },
    { id: 'opportunite', label: 'Opportunité (Angle d’exploration)', type: 'text', placeholder: 'Ex. piste à tester / question à creuser' },
  ], [config.fields]);

  const [rows, setRows] = useState<Row[]>([]);
  const [sampleMode, setSampleMode] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`pattern_builder::${storageKey}`);
      const saved = raw ? (JSON.parse(raw) as Row[]) : null;
      if (saved && saved.length) {
        setRows(saved);
        setSampleMode(false);
      } else {
        // Seed two examples to make intent obvious (non persistés tant qu'aucun ajout)
        const s1: Row = { id: 'sample-1' } as Row;
        const s2: Row = { id: 'sample-2' } as Row;
        for (const f of fields) {
          if (f.id === 'theme') { s1[f.id] = 'Organisation'; s2[f.id] = 'Motivation'; }
          else if (f.id === 'observation') { s1[f.id] = '“Je commence toujours en retard.”'; s2[f.id] = '“Je procrastine tant que je ne vois pas l’intérêt.”'; }
          else if (f.id === 'interpretation') { s1[f.id] = 'Besoin de cadre simple et visuel'; s2[f.id] = 'Manque de sens — besoin de voir l’utilité immédiate'; }
          else { s1[f.id] = ''; s2[f.id] = ''; }
        }
        setRows([s2, s1]);
        setSampleMode(true);
      }
    } catch { /* ignore */ }
  }, [storageKey, fields]);

  useEffect(() => {
    if (sampleMode) return; // ne pas persister les exemples seed
    try { localStorage.setItem(`pattern_builder::${storageKey}`, JSON.stringify(rows)); } catch {}
  }, [rows, storageKey, sampleMode]);

  const add = () => {
    const empty = fields.every((f) => !((draft[f.id] ?? '').trim()));
    if (empty) return;
    const row: Row = { id: uid() } as Row;
    for (const f of fields) row[f.id] = (draft[f.id] ?? '').trim();
    setRows((prev) => [row, ...prev.filter((r)=> !r.id.startsWith('sample-'))]);
    if (sampleMode) setSampleMode(false);
    setDraft({});
    setLastAdded(row.id);
    setToast('✅ Motif ajouté');
    window.setTimeout(() => setToast(null), 2200);
  };
  const remove = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const md = useMemo(() => {
    if ((config.outputFormat ?? 'table') === 'markdown' || true) {
      const head = `| ${fields.map((f)=>f.label).join(' | ')} |\n|${fields.map(()=> '---').join('|')}|`;
      const lines = rows.map((r) => `| ${fields.map((f)=> (r[f.id] ?? '').replace(/\n/g,' ')).join(' | ')} |`);
      return [head, ...lines].join('\n');
    }
    return '';
  }, [rows, fields, config.outputFormat]);

  const copy = async () => { try { await navigator.clipboard.writeText(md); } catch {} };

  return (
    <section className="widget-surface p-5 space-y-4">
      {(config.title || toast) ? (
        <div className="flex items-center justify-between">
          {config.title ? <h3 className="text-lg font-semibold">{config.title}</h3> : <div />}
          {toast ? (
            <div className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 animate-slide-in">
              {toast}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Aide pédagogique */}
      <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-[0.92rem] leading-6 text-slate-700">
        <div className="font-semibold text-slate-800 mb-1">Comment remplir ?</div>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Symptôme</strong> (Observation) — ce que tu <em>vois/entends</em> exactement, sans reformulation.</li>
          <li><strong>Cause possible</strong> (Ce que ça montre) — le <em>besoin/tension</em> derrière le symptôme.</li>
          <li><strong>Opportunité</strong> — l’angle d’exploration que cela ouvre (idée de piste, à tester).</li>
        </ul>
      </div>

      {/* Draft entry */}
      <div className="grid gap-3 md:grid-cols-3">
        {fields.map((f) => (
          <label key={`draft-${f.id}`} className="block space-y-1">
            <span className="text-xs font-medium text-slate-600 inline-flex items-center gap-1">
              {f.label}
              <span
                className="inline-flex items-center justify-center w-4 h-4 text-[10px] leading-none rounded-full bg-slate-100 text-slate-600 border"
                title={
                  f.id.toLowerCase().includes('observ') || f.id.toLowerCase().includes('sympt')
                    ? 'Ce que vous avez vu ou entendu (verbatim brut)'
                    : f.id.toLowerCase().includes('interpret') || f.id.toLowerCase().includes('cause')
                      ? 'Le besoin ou la tension que cela révèle'
                      : f.id.toLowerCase().includes('opport')
                        ? 'Ce que ça vous donne envie d’explorer'
                        : f.placeholder || undefined
                }
                aria-label="Aide"
              >?
              </span>
            </span>
            {f.type === 'textarea' ? (
              <textarea
                value={draft[f.id] ?? ''}
                onChange={(e)=> setDraft((d)=> ({ ...d, [f.id]: e.target.value }))}
                placeholder={f.placeholder}
                rows={3}
                className="w-full rounded-xl border bg-white/90 px-3 py-2 text-sm"
              />
            ) : (
              <input
                value={draft[f.id] ?? ''}
                onChange={(e)=> setDraft((d)=> ({ ...d, [f.id]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full rounded-xl border bg-white/90 px-3 py-2 text-sm"
              />
            )}
            
          </label>
        ))}
      </div>

      <div className="widget-actions text-xs"><button onClick={add} className="btn btn-primary text-xs">➕ Ajouter un motif</button></div>

      {/* Table of patterns */}
      <div className="overflow-auto rounded-xl border">
        <table className="w-full min-w-[540px] text-sm">
          <thead className="bg-slate-50/70">
            <tr>
              {fields.map((f) => (<th key={`h-${f.id}`} className="px-3 py-2 text-left font-semibold">{f.label}</th>))}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.id} className={`border-t ${idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'} ${lastAdded === r.id ? 'animate-slide-in' : ''}`}>
                {fields.map((f) => (
                  <td key={`${r.id}-${f.id}`} className="px-3 py-2 align-top whitespace-pre-wrap">{r[f.id] ?? ''}</td>
                ))}
                <td className="px-3 py-2 text-right"><button onClick={()=>remove(r.id)} className="btn btn-ghost text-xs">Suppr.</button></td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={fields.length+1} className="px-3 py-4 text-slate-500 text-center">Aucun motif pour l’instant</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="widget-actions text-xs">
        <button onClick={copy} className="btn btn-ghost text-xs">Copier en Markdown</button>
      </div>
    </section>
  );
}
