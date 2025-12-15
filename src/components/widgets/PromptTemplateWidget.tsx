"use client";

import { useMemo, useState } from "react";
import { Heading } from "@/components/ui/Heading";
import type { PromptTemplateWidgetConfig } from "@/lib/widget-parser";
import { renderTemplate } from "@/lib/widget-parser";

export function PromptTemplateWidget({ config, storageKey }: { config: PromptTemplateWidgetConfig; storageKey: string }) {
  const theme = config.theme ?? "light";

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
        "overflow-hidden rounded-[var(--r-xl)] border shadow-[var(--shadow-subtle)]",
        "border-[color-mix(in_oklab,var(--fg)_14%,transparent)] bg-[color-mix(in_oklab,var(--fg)_94%,#000)] text-[color:var(--bg)]",
        "px-0 py-0",
      ].join(" ");
    }
    return "surface-card space-y-[var(--space-m)]";
  }, [theme]);

  const headerClass =
    theme === "dark"
      ? "flex items-center justify-between gap-3 border-b border-[color-mix(in_oklab,var(--bg)_14%,transparent)] bg-[color-mix(in_oklab,var(--fg)_88%,#000)] px-[var(--space-4)] py-[var(--space-3)] text-xs uppercase tracking-[0.2em] text-[color-mix(in_oklab,var(--bg)_85%,#fff)]"
      : "flex items-center justify-between";

  const controlsClass =
    theme === "dark"
      ? "widget-actions flex flex-wrap items-center gap-2"
      : "widget-actions flex flex-wrap items-center gap-2";

  const primaryBtnClass =
    theme === "dark"
      ? "rounded-full bg-[color:var(--bg)] px-[var(--space-4)] py-[0.375rem] text-[11px] font-semibold text-[color:var(--fg)] shadow-sm transition hover:shadow-md"
      : "btn btn-primary text-xs";

  const ghostBtnClass =
    theme === "dark"
      ? "rounded-full border border-[color-mix(in_oklab,var(--bg)_22%,transparent)] px-3 py-1 text-[11px] font-medium text-[color-mix(in_oklab,var(--bg)_82%,#fff)] transition hover:border-[color-mix(in_oklab,var(--bg)_40%,transparent)] hover:text-[color:var(--bg)]"
      : "btn btn-ghost text-xs";

  const subtleBtnClass =
    theme === "dark"
      ? "text-[11px] text-[color-mix(in_oklab,var(--bg)_80%,#fff)] hover:text-[color:var(--bg)] disabled:opacity-40 disabled:cursor-default"
      : "btn btn-ghost text-xs";

  const labelClass =
    theme === "dark"
      ? "text-xs font-semibold uppercase tracking-wider text-[color:var(--bg)]"
      : "text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]";

  const inputClass = (hasValue: boolean) =>
    theme === "dark"
      ? [
          "w-full rounded-[var(--r-lg)] border bg-[color-mix(in_oklab,var(--fg)_92%,#000)] px-[var(--space-3)] py-[var(--space-2)] text-sm text-[color:var(--bg)] placeholder:text-[color-mix(in_oklab,var(--bg)_70%,#fff)]",
          hasValue ? "border-[color-mix(in_oklab,var(--bg)_24%,transparent)]" : "border-[color-mix(in_oklab,var(--accent)_50%,transparent)]",
          "focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--bg)_22%,transparent)]",
        ].join(" ")
      : [
          "w-full rounded-[var(--r-lg)] border bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] px-[var(--space-3)] py-[var(--space-2)] text-sm text-[color:var(--fg)] shadow-sm",
          hasValue ? "border-[color:var(--border)]" : "border-[color-mix(in_oklab,var(--accent)_45%,transparent)]",
          "focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--primary)_22%,transparent)] focus:border-[color-mix(in_oklab,var(--primary)_50%,transparent)]",
        ].join(" ");

  const outputWrapperClass =
    theme === "dark"
      ? "mt-2 rounded-[var(--r-xl)] border border-[color-mix(in_oklab,var(--bg)_18%,transparent)] bg-[color-mix(in_oklab,var(--fg)_92%,#000)] p-[var(--space-4)] text-[0.95rem] leading-[1.5] whitespace-pre-wrap text-[color:var(--bg)]"
      : "mt-2 rounded-[var(--r-xl)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] p-[var(--space-4)] text-[0.95rem] leading-[1.5] whitespace-pre-wrap text-[color:var(--fg)] shadow-sm";

  const outputPlaceholderClass =
    theme === "dark"
      ? "rounded-[var(--r-xl)] border border-dashed border-[color-mix(in_oklab,var(--accent)_60%,transparent)] bg-[color-mix(in_oklab,var(--fg)_90%,#000)] p-[var(--space-4)] text-sm text-[color:var(--bg)]"
      : "rounded-[var(--r-xl)] border border-dashed border-[color-mix(in_oklab,var(--accent)_50%,transparent)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] p-[var(--space-4)] text-sm text-[color:var(--muted)]";

  return (
    <section className={wrapperClass}>
      <div className={headerClass}>
        {config.title ? (
          <Heading level={3} className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:inherit]">
            {config.title}
          </Heading>
        ) : (
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:inherit]">
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
                      ? "border-[color-mix(in_oklab,var(--bg)_26%,transparent)] bg-[color-mix(in_oklab,var(--fg)_86%,#000)] text-[color:var(--bg)]"
                      : "border-[color-mix(in_oklab,var(--success)_45%,transparent)] bg-[color-mix(in_oklab,var(--success)_12%,#fff)] text-[color-mix(in_oklab,var(--success)_85%,#0f1728)]";
                  const inactiveClasses =
                    theme === "dark"
                      ? "border-[color-mix(in_oklab,var(--bg)_26%,transparent)] text-[color-mix(in_oklab,var(--bg)_82%,#fff)] hover:border-[color-mix(in_oklab,var(--accent)_40%,transparent)] hover:text-[color:var(--bg)]"
                      : "border-[color:var(--border)] text-[color:var(--muted)] hover:border-[color-mix(in_oklab,var(--accent)_40%,transparent)] hover:text-[color-mix(in_oklab,var(--accent)_80%,#0f1728)]";
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

      <div className="space-y-2 px-[var(--space-5)] pb-[var(--space-5)]">
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
