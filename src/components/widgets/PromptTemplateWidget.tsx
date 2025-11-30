"use client";

import { useMemo, useState } from "react";
import type { PromptTemplateWidgetConfig } from "@/lib/widget-parser";
import { renderTemplate } from "@/lib/widget-parser";

export function PromptTemplateWidget({ config, storageKey }: { config: PromptTemplateWidgetConfig; storageKey: string }) {
  const theme = config.theme ?? "light";
  const wide = Boolean((config as { wide?: boolean }).wide);

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

  const fieldsWithHints = useMemo(
    () =>
      config.fields.map((f) => ({
        ...f,
        placeholder: f.placeholder ?? hintFor(f.name),
        span:
          f.type === "textarea" ||
          f.type === "chips" ||
          /BLOCK|LIST|PARAGRAPH|DESCRIPTION|QUERIES/i.test(f.name)
            ? 2
            : 1,
      })),
    [config.fields]
  );

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

  const wrapperClass = useMemo(() => {
    if (theme === "dark") {
      return [
        "overflow-hidden rounded-[22px] border shadow-subtle",
        "border-slate-900/40 bg-slate-900 text-slate-50",
        wide ? "px-0" : "px-0",
        "py-0",
      ].join(" ");
    }
    return "widget-surface p-5 space-y-5";
  }, [theme, wide]);

  const headerClass =
    theme === "dark"
      ? "flex items-center justify-between gap-3 border-b border-white/10 bg-slate-900/60 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-50"
      : "flex items-center justify-between";

  const controlsClass =
    theme === "dark"
      ? "widget-actions flex flex-wrap items-center gap-2"
      : "widget-actions flex flex-wrap items-center gap-2";

  const primaryBtnClass =
    theme === "dark"
      ? "rounded-full bg-white px-4 py-1.5 text-[11px] font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
      : "btn btn-primary text-xs";

  const ghostBtnClass =
    theme === "dark"
      ? "rounded-full border border-white/10 px-3 py-1 text-[11px] font-medium text-slate-200 transition hover:border-white/30 hover:text-white"
      : "btn btn-ghost text-xs";

  const subtleBtnClass =
    theme === "dark"
      ? "text-[11px] text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-default"
      : "btn btn-ghost text-xs";

  const labelClass =
    theme === "dark"
      ? "text-xs font-semibold uppercase tracking-wider text-slate-100"
      : "text-xs font-semibold uppercase tracking-wider text-slate-600";

  const inputClass = (hasValue: boolean) =>
    theme === "dark"
      ? [
          "w-full rounded-xl border bg-slate-900/60 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500",
          hasValue ? "border-slate-700" : "border-amber-300/80",
          "focus:outline-none focus:ring-2 focus:ring-white/10",
        ].join(" ")
      : [
          "w-full rounded-xl border bg-white/80 px-3 py-2 text-sm",
          hasValue ? "border-slate-200" : "border-amber-300",
          "focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400",
        ].join(" ");

  const outputWrapperClass =
    theme === "dark"
      ? "mt-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-[0.95rem] leading-[1.5] whitespace-pre-wrap"
      : "mt-2 rounded-2xl border bg-white/80 p-4 text-[0.95rem] leading-[1.5] whitespace-pre-wrap";

  const outputPlaceholderClass =
    theme === "dark"
      ? "rounded-2xl border border-dashed border-amber-300/80 bg-slate-900/70 p-4 text-sm text-slate-200"
      : "rounded-2xl border border-dashed border-amber-200 bg-white/70 p-4 text-sm text-slate-600";

  return (
    <section className={wrapperClass}>
      <div className={headerClass}>
        {config.title ? (
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-50">
            {config.title}
          </h3>
        ) : (
          <span className="text-xs font-semibold uppercase tracking-[0.2em]">
            Prompt template
          </span>
        )}
        <div className={controlsClass}>
          <button onClick={sampleFill} className={ghostBtnClass}>
            Remplir un exemple
          </button>
          <button onClick={clearAll} className={subtleBtnClass}>
            Vider
          </button>
          <button onClick={handleGenerate} className={primaryBtnClass}>
            Générer mon prompt
          </button>
          <button onClick={copy} className={subtleBtnClass} disabled={!showGenerated}>
            Copier
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2">
        {fieldsWithHints.map((f) => (
          <label key={`${storageKey}-${f.name}`} className={`block space-y-1 ${f.span === 2 ? 'md:col-span-2' : ''}`}>
            <span className={labelClass}>{f.label ?? f.name}</span>
            {f.type === "textarea" ? (
              <textarea
                value={values[f.name] ?? ''}
                onChange={(e) => setValue(f.name, e.target.value)}
                placeholder={f.placeholder}
                rows={6}
                className={inputClass(Boolean(values[f.name]))}
              />
            ) : f.type === "chips" && Array.isArray(f.options) ? (
              <div className="flex flex-wrap gap-2">
                {f.options.map((option) => {
                  const current = values[f.name] ?? "";
                  const selected = new Set(
                    current
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean)
                  );
                  const isActive = selected.has(option);
                  const toggle = () => {
                    const next = new Set(selected);
                    if (next.has(option)) next.delete(option);
                    else next.add(option);
                    const joined = Array.from(next).join(", ");
                    setValue(f.name, joined);
                  };
                  const base =
                    "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition";
                  const activeClasses =
                    theme === "dark"
                      ? "border-emerald-400 bg-emerald-900 text-emerald-200"
                      : "border-emerald-400 bg-emerald-50 text-emerald-700";
                  const inactiveClasses =
                    theme === "dark"
                      ? "border-slate-600 text-slate-200 hover:border-emerald-300 hover:text-emerald-200"
                      : "border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-600";
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={toggle}
                      className={`${base} ${isActive ? activeClasses : inactiveClasses}`}
                    >
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                value={values[f.name] ?? ''}
                onChange={(e) => setValue(f.name, e.target.value)}
                placeholder={f.placeholder}
                className={inputClass(Boolean(values[f.name]))}
              />
            )}
          </label>
        ))}
      </div>

      <div className="space-y-2 px-5 pb-5">
        <span className={labelClass}>Prompt généré</span>
        {showGenerated ? (
          <pre className={outputWrapperClass}>
            <code>{output}</code>
          </pre>
        ) : (
          <div className={outputPlaceholderClass}>
            Cliquez sur « Générer mon prompt » pour afficher le résultat.
          </div>
        )}
      </div>
    </section>
  );
}
