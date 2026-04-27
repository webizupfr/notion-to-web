"use client";

import { useEffect, useState } from "react";

import type { PromptWidgetConfig } from "@/lib/widget-parser";
import { useCopy, copyFeedbackLabel } from "./useCopy";

type PromptStorage = { prompt: string };

export function PromptWidget({ config, storageKey }: { config: PromptWidgetConfig; storageKey: string }) {
  const [mounted, setMounted] = useState(false);
  const [prompt, setPrompt] = useState(config.template);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as PromptStorage;
        if (typeof parsed.prompt === "string") {
          setPrompt(parsed.prompt);
          setMounted(true);
          return;
        }
      }
    } catch { /* ignore */ }
    setPrompt(config.template);
    setMounted(true);
  }, [config.template, storageKey]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ prompt } satisfies PromptStorage));
    } catch { /* ignore */ }
  }, [mounted, prompt, storageKey]);

  const { copy, status: copyStatus } = useCopy();
  const handleCopy = () => copy(prompt);

  const handleReset = () => {
    setPrompt(config.template);
    try {
      localStorage.removeItem(storageKey);
    } catch { /* ignore */ }
  };

  return (
    <section className="widget-shell">
      <div className="widget-header">
        <span className="widget-header__eyebrow">Prompt éditable</span>
        {config.title ? <h3 className="widget-header__title">{config.title}</h3> : null}
      </div>

      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        rows={Math.max(6, Math.ceil(prompt.length / 80))}
        className="font-[family-name:var(--font-mono)] text-[0.92rem] leading-[1.55]"
        aria-label={config.title ?? "Prompt"}
      />

      <div className="widget-actions">
        <span
          className="mr-auto font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
          role="status"
          aria-live="polite"
        >
          {copyFeedbackLabel(copyStatus)}
        </span>
        <button onClick={handleCopy} className="btn btn-primary text-xs" disabled={!prompt.trim()}>
          Copier
        </button>
        <button onClick={handleReset} className="btn btn-ghost text-xs">
          Réinitialiser
        </button>
      </div>
    </section>
  );
}
