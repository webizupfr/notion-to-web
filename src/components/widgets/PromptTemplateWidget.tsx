"use client";

import { useMemo, useState } from "react";
import type { PromptTemplateWidgetConfig } from "@/lib/widget-parser";
import { renderTemplate } from "@/lib/widget-parser";

export function PromptTemplateWidget({ config, storageKey }: { config: PromptTemplateWidgetConfig; storageKey: string }) {
  const hintFor = (name: string): string | undefined => {
    const n = name.toUpperCase();
    if (n.includes('RUN_TIME')) return '08:30';
    if (n.includes('TIMEZONE')) return 'Europe/Paris';
    if (n.includes('LOOKBACK') || n.includes('WINDOW')) return '24h';
    if (n.includes('LANGUAGE')) return 'French';
    if (n.includes('DOMAINS')) return 'AI, Product, Policy';
    if (n.includes('TARGETS') || n.includes('AUDIENCE')) return 'PMs, Founders, Researchers';
    if (n.includes('REGION')) return 'France, EU';
    if (n.includes('QUERIES') || n.includes('BLOCK')) return '("AI" OR "Artificial Intelligence") AND (France OR EU)';
    if (n.includes('MAX_AGE')) return '48h';
    if (n.includes('N_ITEMS')) return '5';
    if (n.includes('SUMMARY_WORDS')) return '180';
    if (n.includes('BRAND_OR_TEAM')) return 'Impulsion';
    if (n.includes('VALUE_LENS')) return 'impact';
    if (n.includes('NOTHING_TO_REPORT_TEXT')) return 'Rien de saillant aujourd\'hui';
    if (n.includes('DELIVERY_CHANNEL')) return 'Email';
    if (n.includes('EMAIL_RECIPIENTS')) return 'hello@impulsion.studio';
    if (n.includes('SLACK_USER')) return 'arthur';
    if (n.includes('TAGS')) return 'policy, product, funding';
    if (n.includes('REPORT_TITLE')) return 'Veille IA';
    if (n === 'DATE') return 'YYYY-MM-DD';
    if (n.includes('TONE')) return 'concise, actionable';
    return undefined;
  };

  const fieldsWithHints = useMemo(() => config.fields.map((f) => ({
    ...f,
    placeholder: f.placeholder ?? hintFor(f.name),
    span: (f.type === 'textarea' || /BLOCK|LIST|PARAGRAPH|DESCRIPTION|QUERIES/i.test(f.name)) ? 2 : 1,
  })), [config.fields]);

  const initial = useMemo(() => {
    const obj: Record<string, string> = {};
    for (const f of fieldsWithHints) {
      if (f.default) obj[f.name] = f.default;
      else obj[f.name] = '';
    }
    // Persist per page id
    try {
      const saved = localStorage.getItem(`prompt_template::${storageKey}`);
      if (saved) return { ...obj, ...JSON.parse(saved) };
    } catch {}
    return obj;
  }, [fieldsWithHints, storageKey]);

  const [values, setValues] = useState<Record<string, string>>(initial);
  const [showGenerated, setShowGenerated] = useState(false);
  const output = useMemo(() => renderTemplate(config.template, values), [config.template, values]);

  const setValue = (name: string, val: string) => {
    setValues((v) => {
      const next = { ...v, [name]: val };
      try { localStorage.setItem(`prompt_template::${storageKey}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(output); } catch {}
  };

  const handleGenerate = () => {
    setShowGenerated(true);
  };

  const sampleFill = () => {
    const next: Record<string, string> = {};
    for (const f of fieldsWithHints) next[f.name] = values[f.name] || f.placeholder || '';
    setValues(next);
    try { localStorage.setItem(`prompt_template::${storageKey}`, JSON.stringify(next)); } catch {}
    setShowGenerated(true);
  };

  const clearAll = () => {
    const next: Record<string, string> = {};
    for (const f of fieldsWithHints) next[f.name] = '';
    setValues(next);
    try { localStorage.setItem(`prompt_template::${storageKey}`, JSON.stringify(next)); } catch {}
    setShowGenerated(false);
  };

  return (
    <section className="widget-surface p-5 space-y-5">
      {config.title ? <h3 className="text-lg font-semibold">{config.title}</h3> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {fieldsWithHints.map((f) => (
          <label key={`${storageKey}-${f.name}`} className={`block space-y-1 ${f.span === 2 ? 'md:col-span-2' : ''}`}>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">{f.label ?? f.name}</span>
            {f.type === 'textarea' ? (
              <textarea
                value={values[f.name] ?? ''}
                onChange={(e) => setValue(f.name, e.target.value)}
                placeholder={f.placeholder}
                rows={6}
                className={`w-full rounded-xl border bg-white/80 px-3 py-2 text-sm ${!values[f.name] ? 'border-amber-300' : ''}`}
              />
            ) : (
              <input
                value={values[f.name] ?? ''}
                onChange={(e) => setValue(f.name, e.target.value)}
                placeholder={f.placeholder}
                className={`w-full rounded-xl border bg-white/80 px-3 py-2 text-sm ${!values[f.name] ? 'border-amber-300' : ''}`}
              />
            )}
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Prompt généré</span>
          <div className="widget-actions">
            <button onClick={sampleFill} className="btn btn-ghost text-xs">Remplir un exemple</button>
            <button onClick={clearAll} className="btn btn-ghost text-xs">Vider</button>
            <button onClick={handleGenerate} className="btn btn-primary text-xs">Générer mon prompt personnalisé</button>
            <button onClick={copy} className="btn btn-ghost text-xs" disabled={!showGenerated}>Copier</button>
          </div>
        </div>
        {showGenerated ? (
          <pre className="code-block rounded-2xl border bg-white/80 p-4 text-[0.95rem] leading-[1.5] whitespace-pre-wrap">
            <code>{output}</code>
          </pre>
        ) : (
          <div className="rounded-2xl border border-dashed border-amber-200 bg-white/70 p-4 text-sm text-slate-600">
            Cliquez sur « Générer mon prompt personnalisé » pour afficher le résultat.
          </div>
        )}
      </div>
    </section>
  );
}
