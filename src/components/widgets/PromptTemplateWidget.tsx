"use client";

import { useMemo, useState } from "react";
import type { PromptTemplateWidgetConfig } from "@/lib/widget-parser";
import { renderTemplate } from "@/lib/widget-parser";
import { brand } from "@/config/brand";
import { useCopy, copyFeedbackLabel } from "./useCopy";

export function PromptTemplateWidget({
  config,
  storageKey,
}: {
  config: PromptTemplateWidgetConfig;
  storageKey: string;
}) {
  const hintFor = (name: string): string | undefined => {
    const n = name.toUpperCase();
    if (n.includes("RUN_TIME")) return "08:30";
    if (n.includes("TIMEZONE")) return "Europe/Paris";
    if (n.includes("LOOKBACK") || n.includes("WINDOW")) return "24h";
    if (n.includes("LANGUAGE")) return "French";
    if (n.includes("DOMAINS")) return "AI, Product, Policy";
    if (n.includes("TARGETS") || n.includes("AUDIENCE")) return "PMs, Founders, Researchers";
    if (n.includes("REGION")) return "France, EU";
    if (n.includes("QUERIES") || n.includes("BLOCK")) return '("AI" OR "Artificial Intelligence") AND (France OR EU)';
    if (n.includes("MAX_AGE")) return "48h";
    if (n.includes("N_ITEMS")) return "5";
    if (n.includes("SUMMARY_WORDS")) return "180";
    if (n.includes("BRAND_OR_TEAM")) return brand.brandOrTeamLabel;
    if (n.includes("VALUE_LENS")) return "impact";
    if (n.includes("NOTHING_TO_REPORT_TEXT")) return "Rien de saillant aujourd'hui";
    if (n.includes("DELIVERY_CHANNEL")) return "Email";
    if (n.includes("EMAIL_RECIPIENTS")) return brand.supportEmail;
    if (n.includes("SLACK_USER")) return "arthur";
    if (n.includes("TAGS")) return "policy, product, funding";
    if (n.includes("REPORT_TITLE")) return "Veille IA";
    if (n === "DATE") return "YYYY-MM-DD";
    if (n.includes("TONE")) return "concise, actionable";
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
    [config.fields],
  );

  const initial = useMemo(() => {
    const obj: Record<string, string> = {};
    for (const f of fieldsWithHints) {
      obj[f.name] = f.default ?? "";
    }
    try {
      const saved = localStorage.getItem(`prompt_template::${storageKey}`);
      if (saved) return { ...obj, ...JSON.parse(saved) };
    } catch { /* ignore */ }
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

  const { copy, status: copyStatus } = useCopy();
  const handleCopy = () => copy(output);

  const handleGenerate = () => setShowGenerated(true);

  const sampleFill = () => {
    const next: Record<string, string> = {};
    for (const f of fieldsWithHints) next[f.name] = values[f.name] || f.placeholder || "";
    setValues(next);
    try { localStorage.setItem(`prompt_template::${storageKey}`, JSON.stringify(next)); } catch {}
    setShowGenerated(true);
  };

  const clearAll = () => {
    const next: Record<string, string> = {};
    for (const f of fieldsWithHints) next[f.name] = "";
    setValues(next);
    try { localStorage.setItem(`prompt_template::${storageKey}`, JSON.stringify(next)); } catch {}
    setShowGenerated(false);
  };

  if (!fieldsWithHints.length) {
    return (
      <section className="widget-shell">
        <p className="m-0 text-sm text-[color:var(--text-tertiary)]">Aucun champ configuré.</p>
      </section>
    );
  }

  return (
    <section className="widget-shell">
      <div className="widget-header">
        <span className="widget-header__eyebrow">Prompt template</span>
        {config.title ? <h3 className="widget-header__title">{config.title}</h3> : null}
      </div>

      <div className="grid gap-[var(--space-md)] md:grid-cols-2">
        {fieldsWithHints.map((f) => (
          <label
            key={`${storageKey}-${f.name}`}
            className={`block space-y-1 ${f.span === 2 ? "md:col-span-2" : ""}`}
          >
            <span className="widget-label">{f.label ?? f.name}</span>
            {f.type === "textarea" ? (
              <textarea
                value={values[f.name] ?? ""}
                onChange={(e) => setValue(f.name, e.target.value)}
                placeholder={f.placeholder}
                rows={6}
              />
            ) : f.type === "chips" && Array.isArray(f.options) ? (
              <div className="flex flex-wrap gap-2" role="group" aria-label={f.label ?? f.name}>
                {f.options.map((option) => {
                  const current = values[f.name] ?? "";
                  const selected = new Set(
                    current.split(",").map((v) => v.trim()).filter(Boolean),
                  );
                  const isActive = selected.has(option);
                  const toggle = () => {
                    const next = new Set(selected);
                    if (next.has(option)) next.delete(option);
                    else next.add(option);
                    setValue(f.name, Array.from(next).join(", "));
                  };
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={isActive}
                      onClick={toggle}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        isActive
                          ? "border-[color:var(--accent-edge)] bg-[color:var(--accent-bg)] text-[color:var(--text-primary)]"
                          : "border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            ) : (
              <input
                value={values[f.name] ?? ""}
                onChange={(e) => setValue(f.name, e.target.value)}
                placeholder={f.placeholder}
              />
            )}
          </label>
        ))}
      </div>

      <div className="widget-actions">
        <span
          className="mr-auto font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
          role="status"
          aria-live="polite"
        >
          {copyFeedbackLabel(copyStatus) || (showGenerated ? "Prompt généré" : "")}
        </span>
        <button onClick={sampleFill} className="btn btn-ghost text-xs">
          Exemple
        </button>
        <button onClick={clearAll} className="btn btn-ghost text-xs">
          Vider
        </button>
        <button onClick={handleGenerate} className="btn btn-primary text-xs">
          Générer
        </button>
        <button
          onClick={handleCopy}
          className="btn btn-ghost text-xs"
          disabled={!showGenerated}
          aria-disabled={!showGenerated}
        >
          Copier
        </button>
      </div>

      {showGenerated ? (
        <div className="widget-preview">
          <span className="widget-preview__label">Prompt généré</span>
          <pre className="m-0 whitespace-pre-wrap text-[0.92rem] leading-[1.55] text-[color:var(--text-primary)] font-[family-name:var(--font-mono)]">
            <code>{output}</code>
          </pre>
        </div>
      ) : (
        <div className="rounded-[var(--r-m)] border border-dashed border-[color:var(--border-subtle)] p-[var(--space-md)] text-sm text-[color:var(--text-tertiary)] italic">
          Cliquez sur « Générer » pour afficher le résultat.
        </div>
      )}
    </section>
  );
}
