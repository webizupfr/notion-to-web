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
    <section className="space-y-4 widget-surface px-5 py-6">
      {/* Tabs header */}
      <div className="flex flex-wrap items-center gap-2">
        {config.sections.map((section) => {
          const isActive = activeTab === section.id;
          const { filled, total } = sectionProgress(section.id);
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveTab(section.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-700"
              }`}
            >
              <span>{section.label}</span>
              <span className={`ml-2 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                filled === total && total > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}>
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
          <div key={section.id} className="space-y-4">
            {section.help ? (
              <div className="rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-[0.82rem] leading-6 text-slate-600">
                {section.help}
              </div>
            ) : null}

            <div className="space-y-4">
              {section.fields.map((field) => (
                <div key={field.name} className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700" htmlFor={`${storageKey}-${field.name}`}>
                    {field.label}
                  </label>
                  <textarea
                    id={`${storageKey}-${field.name}`}
                    value={values[field.name] ?? ""}
                    onChange={(e) => updateField(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    rows={field.placeholder && field.placeholder.length > 120 ? 4 : 3}
                    className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 text-xs text-slate-500">
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
          <div className="overflow-hidden rounded-[22px] border border-slate-900/40 bg-slate-900 text-slate-50">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-900/60 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
              <span>{previewTitle}</span>
              <div className="text-[11px] text-slate-300">Aperçu</div>
            </div>
            <pre className="max-h-[60vh] overflow-auto px-5 py-4 text-[0.92rem] leading-[1.6] whitespace-pre-wrap font-mono">
              {previewText}
            </pre>
          </div>
        ) : (
          <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{previewTitle}</div>
            <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{previewText}</pre>
          </div>
        )
      )}
    </section>
  );
}
