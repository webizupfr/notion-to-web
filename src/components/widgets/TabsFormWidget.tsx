"use client";

import { useEffect, useMemo, useState } from "react";

import { renderTemplate, type TabsFormWidgetConfig, type TabsFormField } from "@/lib/widget-parser";

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

export function TabsFormWidget({ config, storageKey }: { config: TabsFormWidgetConfig; storageKey: string }) {
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
        setMounted(true);
        return;
      }
    } catch {
      // ignore storage errors
    }
    setActiveTab(firstTab);
    setMounted(true);
  }, [firstTab, storageKey]);

  useEffect(() => {
    if (!mounted) return;
    try {
      const payload: TabsFormStorage = { values, active: activeTab };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [mounted, values, activeTab, storageKey]);

  const mergedValues = useMemo(() => {
    const map: Record<string, string> = { outputTitle: config.outputTitle ?? config.title ?? "" };
    for (const field of collectAllFields(config)) {
      map[field.name] = values[field.name] ?? "";
    }
    return map;
  }, [config, values]);

  const preview = useMemo(() => renderTemplate(config.template, mergedValues), [config.template, mergedValues]);

  const updateField = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  // Note: aggregate completion available via sectionProgress; total completion can be derived if needed.

  const sectionProgress = (sectionId: string) => {
    const section = config.sections.find((s) => s.id === sectionId);
    if (!section) return { filled: 0, total: 0 };
    const total = section.fields.length;
    const filled = section.fields.filter((f) => (values[f.name] ?? "").trim().length > 0).length;
    return { filled, total };
  };

  const handleCopy = async () => {
    try {
      const textToCopy = (() => {
        if (!config.previewFromHeading) return preview;
        const idx = preview.indexOf(config.previewFromHeading);
        return idx >= 0 ? preview.slice(idx) : preview;
      })();
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleDownload = () => {
    const blob = new Blob([preview], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(config.outputTitle ?? config.title ?? "sortie").replace(/\s+/g, "-").toLowerCase()}.md`;
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

  const previewText = useMemo(() => {
    if (!config.previewFromHeading) return preview;
    const idx = preview.indexOf(config.previewFromHeading);
    return idx >= 0 ? preview.slice(idx) : preview;
  }, [config.previewFromHeading, preview]);

  const previewTitle = config.previewFromHeading ? "Prompt système" : "Prévisualisation";
  const previewDark = config.previewTheme === 'dark';

  return (
    <section className="surface-card space-y-[var(--space-m)]">
      {/* Tabs header */}
      <div className="flex flex-wrap items-center gap-[var(--space-s)]">
        {config.sections.map((section) => {
          const isActive = activeTab === section.id;
          const { filled, total } = sectionProgress(section.id);
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveTab(section.id)}
              className={`pill ${isActive ? "border-[color-mix(in_srgb,var(--success)_45%,transparent)] bg-[color-mix(in_srgb,var(--success)_18%,white_82%)] text-[color:var(--fg)]" : ""}`}
            >
              <span>{section.label}</span>
              <span
                className={`ml-2 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                filled === total && total > 0
                  ? "bg-[color-mix(in_srgb,var(--success)_20%,white_80%)] text-[color:var(--success)]"
                  : "bg-[color-mix(in_srgb,var(--bg-soft)_92%,white_8%)] text-[color:var(--fg-muted)]"
              }`}
              >
                {filled}/{total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active tab body */}
      {config.sections.map((section) => {
        if (section.id !== activeTab) return null;
        return (
          <div key={section.id} className="space-y-[var(--space-m)]">
            {section.help ? (
              <div className="surface-panel text-[0.9rem] leading-[1.6] text-[color:var(--fg-muted)]">
                {section.help}
              </div>
            ) : null}

            <div className="space-y-[var(--space-s)]">
              {section.fields.map((field) => (
                <div key={field.name} className="space-y-[var(--space-xs)]">
                  <label className="block text-sm font-medium text-[color:var(--fg)]" htmlFor={`${storageKey}-${field.name}`}>
                    {field.label}
                  </label>
                  <textarea
                    id={`${storageKey}-${field.name}`}
                    value={values[field.name] ?? ""}
                    onChange={(e) => updateField(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    rows={field.placeholder && field.placeholder.length > 120 ? 4 : 3}
                    className="w-full rounded-[var(--r-m)] border border-[color:var(--border)] bg-[color:var(--bg-card)] px-[var(--space-3)] py-[var(--space-2)] text-sm text-[color:var(--fg)] shadow-sm focus:border-[color-mix(in_oklab,var(--primary)_50%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--primary)_22%,transparent)]"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center justify-end gap-[var(--space-s)] pt-[var(--space-xs)] text-xs text-[color:var(--fg-muted)]">
        <button onClick={() => setShowPreview(true)} className="btn btn-primary text-xs">
          Générer
        </button>
        <button onClick={handleCopy} className="btn btn-ghost text-xs" disabled={!showPreview}>
          Copier
        </button>
        <button onClick={handleDownload} className="btn btn-ghost text-xs" disabled={!showPreview}>
          Télécharger
        </button>
        <button onClick={handleReset} className="btn btn-ghost text-xs">
          Réinitialiser
        </button>
      </div>

      {showPreview && (
        previewDark ? (
          <div className="overflow-hidden rounded-[var(--r-l)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--fg)_95%,#000)] text-[color:var(--bg)]">
            <div className="flex items-center justify-between gap-3 border-b border-[color-mix(in_oklab,var(--bg)_12%,transparent)] bg-[color-mix(in_oklab,var(--fg)_88%,#000)] px-[var(--space-4)] py-[var(--space-2)] text-xs uppercase tracking-[0.2em] text-[color-mix(in_oklab,var(--bg)_85%,#fff)]">
              <span>{previewTitle}</span>
              <div className="text-[11px] text-[color-mix(in_oklab,var(--bg)_82%,#fff)]">Aperçu</div>
            </div>
            <pre className="notion-codeblock max-h-[60vh] overflow-auto whitespace-pre-wrap font-mono">
              {previewText}
            </pre>
          </div>
        ) : (
          <div className="space-y-[var(--space-xs)] rounded-[var(--r-l)] border border-[color:var(--border)] bg-[color:var(--bg-soft)] px-[var(--space-4)] py-[var(--space-4)]">
            <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--fg-muted)]">{previewTitle}</div>
            <pre className="notion-codeblock whitespace-pre-wrap text-sm leading-6 text-[color:var(--fg)]">{previewText}</pre>
          </div>
        )
      )}
    </section>
  );
}
