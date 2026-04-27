"use client";

import { useEffect, useMemo, useState } from "react";

import { renderTemplate, type FormFieldConfig, type FormWidgetConfig } from "@/lib/widget-parser";
import { useCopy, copyFeedbackLabel } from "./useCopy";

type FormValues = Record<string, string>;

export function FormWidget({ config, storageKey }: { config: FormWidgetConfig; storageKey: string }) {
  const [values, setValues] = useState<FormValues>({});
  const [mounted, setMounted] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const scope = useMemo(() => storageKey.split('::')[0], [storageKey]);
  const aliasKey = useMemo(() => (config.alias ? `form::${scope}::${config.alias}` : null), [scope, config.alias]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as FormValues;
        setValues(parsed);
      }
      if (aliasKey) {
        const a = localStorage.getItem(aliasKey);
        if (a) {
          const parsed = JSON.parse(a) as FormValues;
          // merge but keep explicit storageKey priority
          setValues((prev) => ({ ...parsed, ...prev }));
        }
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, [storageKey, aliasKey]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(values));
      if (aliasKey) localStorage.setItem(aliasKey, JSON.stringify(values));
    } catch {
      // ignore
    }
  }, [values, storageKey, aliasKey, mounted]);

  const mergedValues = useMemo(() => {
    const base: Record<string, string> = { outputTitle: config.outputTitle ?? config.title ?? "" };
    for (const field of config.fields) {
      base[field.name] = values[field.name] ?? "";
    }
    return base;
  }, [config.fields, config.outputTitle, config.title, values]);

  const preview = useMemo(() => renderTemplate(config.template, mergedValues), [config.template, mergedValues]);

  const updateField = (field: FormFieldConfig, value: string) => {
    setValues((prev) => ({ ...prev, [field.name]: value }));
  };

  const allFilled = useMemo(
    () => config.fields.every((field) => (values[field.name] ?? '').trim().length > 0),
    [config.fields, values]
  );

  const { copy, status: copyStatus } = useCopy();
  const handleCopy = () => copy(preview);

  const handleDownload = () => {
    const blob = new Blob([preview], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(config.outputTitle ?? config.title ?? "sortie").replace(/\\s+/g, "-").toLowerCase()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setValues({});
    setShowPreview(false);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  const handleGenerate = () => {
    setShowPreview(true);
  };

  return (
    <section className="widget-shell">
      <div className="space-y-[var(--space-md)]">
        {config.fields.map((field) => (
          <div key={field.name} className="space-y-1">
            <label
              className="widget-label"
              htmlFor={`${storageKey}-${field.name}`}
            >
              {field.label}
            </label>
            <textarea
              id={`${storageKey}-${field.name}`}
              value={values[field.name] ?? ""}
              onChange={(event) => updateField(field, event.target.value)}
              placeholder={field.placeholder}
              rows={field.placeholder && field.placeholder.length > 80 ? 4 : 3}
            />
          </div>
        ))}
      </div>

      <div className="widget-actions pt-2">
        <span
          className="mr-auto font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
          role="status"
          aria-live="polite"
        >
          {!allFilled ? "Remplis tous les champs" : copyFeedbackLabel(copyStatus) || (showPreview ? "Prêt" : "")}
        </span>
        <button onClick={handleGenerate} className="btn btn-primary text-xs" disabled={!allFilled} aria-disabled={!allFilled}>
          Générer
        </button>
        <button onClick={handleCopy} className="btn btn-ghost text-xs" disabled={!showPreview} aria-disabled={!showPreview}>
          Copier
        </button>
        <button onClick={handleDownload} className="btn btn-ghost text-xs" disabled={!showPreview} aria-disabled={!showPreview}>
          Télécharger
        </button>
        <button onClick={handleReset} className="btn btn-ghost text-xs">
          Réinitialiser
        </button>
      </div>

      {showPreview && (
        <div className="widget-preview">
          <span className="widget-preview__label">Prévisualisation</span>
          <pre className="m-0 whitespace-pre-wrap text-[0.92rem] leading-[1.55] text-[color:var(--text-primary)] font-[family-name:var(--font-mono)]">{preview}</pre>
        </div>
      )}
    </section>
  );
}
