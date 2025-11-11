"use client";

import { useEffect, useMemo, useState } from "react";

import { renderTemplate, type ImagePromptWidgetConfig } from "@/lib/widget-parser";

type ImagePromptStorage = {
  text: Record<string, string>;
  chips: Record<string, string[]>;
};

function joinValues(values: string[] | undefined): string {
  if (!values || !values.length) return "";
  return values.join(", ");
}

export function ImagePromptWidget({ config, storageKey }: { config: ImagePromptWidgetConfig; storageKey: string }) {
  const [mounted, setMounted] = useState(false);
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [chipValues, setChipValues] = useState<Record<string, string[]>>({});
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ImagePromptStorage;
        setTextValues(parsed.text ?? {});
        setChipValues(parsed.chips ?? {});
        setMounted(true);
        return;
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;
    try {
      const payload: ImagePromptStorage = { text: textValues, chips: chipValues };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // ignore persistence errors
    }
  }, [mounted, storageKey, textValues, chipValues]);

  const templateValues = useMemo(() => {
    const values: Record<string, string> = {};
    for (const section of config.sections) {
      if (section.type === 'chips') {
        const selected = chipValues[section.id] ?? [];
        values[section.id] = joinValues(selected);
      } else {
        values[section.id] = textValues[section.id] ?? '';
      }
    }
    return values;
  }, [config.sections, chipValues, textValues]);

  const preview = useMemo(() => renderTemplate(config.template, templateValues), [config.template, templateValues]);

  const updateText = (id: string, value: string) => {
    setTextValues((prev) => ({ ...prev, [id]: value }));
  };

  const toggleChip = (sectionId: string, value: string) => {
    setChipValues((prev) => {
      const current = prev[sectionId] ?? [];
      const exists = current.includes(value);
      const next = exists ? current.filter((item) => item !== value) : [...current, value];
      return { ...prev, [sectionId]: next };
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(preview);
    } catch {
      // ignore
    }
  };

  const handleReset = () => {
    setTextValues({});
    setChipValues({});
    setShowPreview(false);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  return (
    <section className="space-y-5 widget-surface px-5 py-6">

      <div className="grid gap-4">
        {config.sections.map((section) => {
          if (section.type === 'chips') {
            const selected = new Set(chipValues[section.id] ?? []);
            return (
              <div key={section.id} className="space-y-2">
                <div className="text-sm font-medium text-slate-700">{section.label}</div>
                {section.options && section.options.length ? (
                  <div className="flex flex-wrap gap-2">
                    {section.options.map((option) => {
                      const isActive = selected.has(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggleChip(section.id, option)}
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition ${
                            isActive ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-600'
                          }`}
                        >
                          <span>{option}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          }

          return (
            <div key={section.id} className="space-y-1">
              <label className="block text-sm font-medium text-slate-700" htmlFor={`${storageKey}-${section.id}`}>
                {section.label}
              </label>
              <textarea
                id={`${storageKey}-${section.id}`}
                value={textValues[section.id] ?? ''}
                onChange={(event) => updateText(section.id, event.target.value)}
                placeholder={section.placeholder}
                rows={section.placeholder && section.placeholder.length > 120 ? 4 : 3}
                className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          );
        })}
      </div>

      <div className="widget-actions text-xs text-slate-500">
        <button
          onClick={() => setShowPreview(true)}
          className="btn btn-primary text-xs"
        >
          Générer
        </button>
        <button onClick={handleCopy} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600">
          <span aria-hidden>📋</span>
          Copier
        </button>
        <button onClick={handleReset} className="text-xs text-slate-400 hover:text-slate-600">
          Réinitialiser
        </button>
      </div>

      {showPreview && (
        <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prompt visuel</div>
          <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{preview}</pre>
        </div>
      )}
    </section>
  );
}
