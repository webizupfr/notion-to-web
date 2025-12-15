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
    <section className="surface-card space-y-[var(--space-m)]">

      <div className="grid gap-4">
        {config.sections.map((section) => {
          if (section.type === 'chips') {
            const selected = new Set(chipValues[section.id] ?? []);
            return (
              <div key={section.id} className="space-y-2">
                <div className="text-sm font-medium text-[color:var(--fg)]">{section.label}</div>
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
                            isActive
                              ? 'border-[color-mix(in_oklab,var(--success)_50%,transparent)] bg-[color-mix(in_oklab,var(--success)_12%,#fff)] text-[color-mix(in_oklab,var(--success)_85%,#0f1728)]'
                              : 'border-[color:var(--border)] text-[color:var(--muted)] hover:border-[color-mix(in_oklab,var(--accent)_40%,transparent)] hover:text-[color-mix(in_oklab,var(--accent)_80%,#0f1728)]'
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
              <label className="block text-sm font-medium text-[color:var(--fg)]" htmlFor={`${storageKey}-${section.id}`}>
                {section.label}
              </label>
              <textarea
                id={`${storageKey}-${section.id}`}
                value={textValues[section.id] ?? ''}
                onChange={(event) => updateText(section.id, event.target.value)}
                placeholder={section.placeholder}
                rows={section.placeholder && section.placeholder.length > 120 ? 4 : 3}
                className="w-full rounded-[var(--r-xl)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] px-[var(--space-4)] py-[var(--space-3)] text-sm text-[color:var(--fg)] shadow-sm focus:border-[color-mix(in_oklab,var(--primary)_50%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--primary)_22%,transparent)]"
              />
            </div>
          );
        })}
      </div>

      <div className="widget-actions text-xs text-[color:var(--muted)]">
        <button
          onClick={() => setShowPreview(true)}
          className="btn btn-primary text-xs"
        >
          Générer
        </button>
        <button onClick={handleCopy} className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs font-medium text-[color:var(--muted)] transition hover:border-[color-mix(in_oklab,var(--accent)_40%,transparent)] hover:text-[color-mix(in_oklab,var(--accent)_80%,#0f1728)]">
          <span aria-hidden>📋</span>
          Copier
        </button>
        <button onClick={handleReset} className="text-xs text-[color:var(--muted)] hover:text-[color:var(--fg)]">
          Réinitialiser
        </button>
      </div>

      {showPreview && (
        <div className="space-y-2 rounded-[var(--r-xl)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] px-[var(--space-4)] py-[var(--space-4)] shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Prompt visuel</div>
          <pre className="whitespace-pre-wrap text-sm leading-6 text-[color:var(--fg)]">{preview}</pre>
        </div>
      )}
    </section>
  );
}
