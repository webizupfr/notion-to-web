"use client";

import { useEffect, useMemo, useState } from "react";

import { renderTemplate, type TabsFormWidgetConfig, type TabsFormField } from "@/lib/widget-parser";
import { useCopy, copyFeedbackLabel } from "./useCopy";

type TabsFormStorage = {
  values: Record<string, string>;
  active?: string;
};

function collectAllFields(config: TabsFormWidgetConfig): TabsFormField[] {
  const acc: TabsFormField[] = [];
  for (const section of config.sections) {
    for (const field of section.fields) acc.push(field);
  }
  return acc;
}

function slugify(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "sortie"
  );
}

export function TabsFormWidget({
  config,
  storageKey,
}: {
  config: TabsFormWidgetConfig;
  storageKey: string;
}) {
  const firstTab = config.sections[0]?.id ?? "";
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(firstTab);
  const [values, setValues] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as TabsFormStorage;
        setValues(parsed.values ?? {});
        setActiveTab(parsed.active ?? firstTab);
      }
    } catch { /* ignore */ }
    setMounted(true);
  }, [firstTab, storageKey]);

  useEffect(() => {
    if (!mounted) return;
    try {
      const payload: TabsFormStorage = { values, active: activeTab };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch { /* ignore */ }
  }, [mounted, values, activeTab, storageKey]);

  const mergedValues = useMemo(() => {
    const map: Record<string, string> = { outputTitle: config.outputTitle ?? config.title ?? "" };
    for (const field of collectAllFields(config)) {
      map[field.name] = values[field.name] ?? "";
    }
    return map;
  }, [config, values]);

  const preview = useMemo(
    () => renderTemplate(config.template, mergedValues),
    [config.template, mergedValues],
  );

  const updateField = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const sectionProgress = (sectionId: string) => {
    const section = config.sections.find((s) => s.id === sectionId);
    if (!section) return { filled: 0, total: 0 };
    const total = section.fields.length;
    const filled = section.fields.filter((f) => (values[f.name] ?? "").trim().length > 0).length;
    return { filled, total };
  };

  const previewText = useMemo(() => {
    if (!config.previewFromHeading) return preview;
    const idx = preview.indexOf(config.previewFromHeading);
    return idx >= 0 ? preview.slice(idx) : preview;
  }, [config.previewFromHeading, preview]);

  const { copy, status: copyStatus } = useCopy();
  const handleCopy = () => copy(previewText);

  const handleDownload = () => {
    const blob = new Blob([preview], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(config.outputTitle ?? config.title ?? "sortie")}.md`;
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
    } catch { /* ignore */ }
  };

  const previewTitle = config.previewFromHeading ? "Prompt système" : "Prévisualisation";

  if (!config.sections.length) {
    return (
      <section className="widget-shell">
        <p className="m-0 text-sm text-[color:var(--text-tertiary)]">Aucune section configurée.</p>
      </section>
    );
  }

  return (
    <section className="widget-shell">
      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-[var(--space-xs)]" role="tablist">
        {config.sections.map((section) => {
          const isActive = activeTab === section.id;
          const { filled, total } = sectionProgress(section.id);
          const complete = total > 0 && filled === total;
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(section.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "border-[color:var(--accent-edge)] bg-[color:var(--accent-bg)] text-[color:var(--text-primary)]"
                  : "border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
              }`}
            >
              <span>{section.label}</span>
              <span
                className={`inline-flex items-center justify-center rounded-[var(--r-s)] px-1.5 py-[1px] font-[family-name:var(--font-mono)] text-[10px] font-semibold ${
                  complete
                    ? "bg-[color:var(--signal-success-bg)] text-[color:var(--signal-success)]"
                    : "bg-[color:var(--surface-2)] text-[color:var(--text-tertiary)]"
                }`}
              >
                {filled}/{total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active tab */}
      {config.sections.map((section) => {
        if (section.id !== activeTab) return null;
        return (
          <div key={section.id} className="space-y-[var(--space-md)]">
            {section.help ? (
              <p className="m-0 text-[0.92rem] leading-[1.55] text-[color:var(--text-secondary)]">
                {section.help}
              </p>
            ) : null}

            <div className="space-y-[var(--space-sm)]">
              {section.fields.map((field) => (
                <div key={field.name} className="space-y-1">
                  <label className="widget-label" htmlFor={`${storageKey}-${field.name}`}>
                    {field.label}
                  </label>
                  <textarea
                    id={`${storageKey}-${field.name}`}
                    value={values[field.name] ?? ""}
                    onChange={(e) => updateField(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    rows={field.placeholder && field.placeholder.length > 120 ? 4 : 3}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="widget-actions">
        <span
          className="mr-auto font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
          role="status"
          aria-live="polite"
        >
          {copyFeedbackLabel(copyStatus) || (showPreview ? "Prêt" : "")}
        </span>
        <button onClick={() => setShowPreview(true)} className="btn btn-primary text-xs">
          Générer
        </button>
        <button
          onClick={handleCopy}
          className="btn btn-ghost text-xs"
          disabled={!showPreview}
          aria-disabled={!showPreview}
        >
          Copier
        </button>
        <button
          onClick={handleDownload}
          className="btn btn-ghost text-xs"
          disabled={!showPreview}
          aria-disabled={!showPreview}
        >
          Télécharger
        </button>
        <button onClick={handleReset} className="btn btn-ghost text-xs">
          Réinitialiser
        </button>
      </div>

      {showPreview ? (
        <div className="widget-preview">
          <span className="widget-preview__label">{previewTitle}</span>
          <pre className="m-0 max-h-[60vh] overflow-auto whitespace-pre-wrap text-[0.92rem] leading-[1.55] text-[color:var(--text-primary)] font-[family-name:var(--font-mono)]">
            {previewText}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
