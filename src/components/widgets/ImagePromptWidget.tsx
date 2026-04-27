"use client";

import { useEffect, useMemo, useState } from "react";

import { renderTemplate, type ImagePromptWidgetConfig } from "@/lib/widget-parser";
import { useCopy, copyFeedbackLabel } from "./useCopy";

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
      }
    } catch { /* ignore */ }
    setMounted(true);
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;
    try {
      const payload: ImagePromptStorage = { text: textValues, chips: chipValues };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch { /* ignore */ }
  }, [mounted, storageKey, textValues, chipValues]);

  const templateValues = useMemo(() => {
    const values: Record<string, string> = {};
    for (const section of config.sections) {
      if (section.type === "chips") {
        const selected = chipValues[section.id] ?? [];
        values[section.id] = joinValues(selected);
      } else {
        values[section.id] = textValues[section.id] ?? "";
      }
    }
    return values;
  }, [config.sections, chipValues, textValues]);

  const preview = useMemo(
    () => renderTemplate(config.template, templateValues),
    [config.template, templateValues],
  );

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

  const { copy, status: copyStatus } = useCopy();
  const handleCopy = () => copy(preview);

  const handleReset = () => {
    setTextValues({});
    setChipValues({});
    setShowPreview(false);
    try {
      localStorage.removeItem(storageKey);
    } catch { /* ignore */ }
  };

  if (!config.sections.length) {
    return (
      <section className="widget-shell">
        <p className="m-0 text-sm text-[color:var(--text-tertiary)]">Aucune section configurée.</p>
      </section>
    );
  }

  return (
    <section className="widget-shell">
      <div className="grid gap-[var(--space-md)]">
        {config.sections.map((section) => {
          if (section.type === "chips") {
            const selected = new Set(chipValues[section.id] ?? []);
            return (
              <div key={section.id} className="space-y-2">
                <span className="widget-label">{section.label}</span>
                {section.options && section.options.length ? (
                  <div
                    className="flex flex-wrap gap-2"
                    role="group"
                    aria-label={section.label}
                  >
                    {section.options.map((option) => {
                      const isActive = selected.has(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => toggleChip(section.id, option)}
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
                  <p className="m-0 text-xs text-[color:var(--text-tertiary)] italic">
                    Aucune option
                  </p>
                )}
              </div>
            );
          }

          return (
            <div key={section.id} className="space-y-1">
              <label className="widget-label" htmlFor={`${storageKey}-${section.id}`}>
                {section.label}
              </label>
              <textarea
                id={`${storageKey}-${section.id}`}
                value={textValues[section.id] ?? ""}
                onChange={(event) => updateText(section.id, event.target.value)}
                placeholder={section.placeholder}
                rows={section.placeholder && section.placeholder.length > 120 ? 4 : 3}
              />
            </div>
          );
        })}
      </div>

      <div className="widget-actions">
        <span
          className="mr-auto font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
          role="status"
          aria-live="polite"
        >
          {copyFeedbackLabel(copyStatus) || (showPreview ? "Prompt généré" : "")}
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
        <button onClick={handleReset} className="btn btn-ghost text-xs">
          Réinitialiser
        </button>
      </div>

      {showPreview && (
        <div className="widget-preview">
          <span className="widget-preview__label">Prompt visuel</span>
          <pre className="m-0 whitespace-pre-wrap text-[0.92rem] leading-[1.55] text-[color:var(--text-primary)] font-[family-name:var(--font-mono)]">
            {preview}
          </pre>
        </div>
      )}
    </section>
  );
}
