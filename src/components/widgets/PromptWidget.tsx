"use client";

import { useEffect, useMemo, useState } from "react";

import type { PromptWidgetConfig } from "@/lib/widget-parser";

type PromptStorage = {
  prompt: string;
};

export function PromptWidget({ config, storageKey }: { config: PromptWidgetConfig; storageKey: string }) {
  const [mounted, setMounted] = useState(false);
  const [prompt, setPrompt] = useState(config.template);

  const theme = config.theme ?? 'light';
  const wide = Boolean((config as { wide?: boolean }).wide);

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
    } catch {
      // ignore
    }
    setPrompt(config.template);
    setMounted(true);
  }, [config.template, storageKey]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ prompt } satisfies PromptStorage));
    } catch {
      // ignore
    }
  }, [mounted, prompt, storageKey]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleReset = () => {
    setPrompt(config.template);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  const wrapperClass = useMemo(() => {
    if (theme === 'dark') {
      return [
        'overflow-hidden rounded-[var(--r-xl)] border shadow-[var(--shadow-subtle)]',
        'border-[color-mix(in_oklab,var(--fg)_14%,transparent)] bg-[color-mix(in_oklab,var(--fg)_94%,#000)] text-[color:var(--bg)]',
        'px-0 py-0',
      ].join(' ');
    }
    return 'surface-card space-y-[var(--space-m)]';
  }, [theme]);

  const headerClass = theme === 'dark'
    ? 'flex items-center justify-between gap-3 border-b border-[color-mix(in_oklab,var(--bg)_14%,transparent)] bg-[color-mix(in_oklab,var(--fg)_88%,#000)] px-[var(--space-4)] py-[var(--space-2)] text-xs uppercase tracking-[0.2em] text-[color-mix(in_oklab,var(--bg)_85%,#fff)]'
    : 'flex items-center justify-between text-xs text-[color:var(--muted)]';

  const copyBtnClass = theme === 'dark'
    ? 'rounded-full border border-[color-mix(in_oklab,var(--bg)_22%,transparent)] px-3 py-1 text-[11px] font-medium text-[color-mix(in_oklab,var(--bg)_82%,#fff)] transition hover:border-[color-mix(in_oklab,var(--bg)_40%,transparent)] hover:text-[color:var(--bg)]'
    : 'inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs font-medium text-[color:var(--muted)] transition hover:border-[color-mix(in_oklab,var(--accent)_40%,transparent)] hover:text-[color-mix(in_oklab,var(--accent)_80%,#0f1728)]';

  const resetBtnClass = theme === 'dark'
    ? 'text-[11px] text-[color-mix(in_oklab,var(--bg)_80%,#fff)] hover:text-[color:var(--bg)]'
    : 'text-xs text-[color:var(--muted)] hover:text-[color:var(--fg)]';

  const textareaClass = theme === 'dark'
    ? [
        'w-full bg-transparent px-[var(--space-5)] py-[var(--space-4)]',
        wide ? 'text-[1rem]' : 'text-[0.94rem]',
        'leading-[1.6] font-mono text-[color:var(--bg)] placeholder:text-[color-mix(in_oklab,var(--bg)_70%,#fff)]',
        'focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--bg)_22%,transparent)] min-h-[220px] resize-y',
      ].join(' ')
    : 'w-full rounded-[var(--r-xl)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] px-[var(--space-4)] py-[var(--space-3)] text-sm leading-6 text-[color:var(--fg)] shadow-sm focus:border-[color-mix(in_oklab,var(--primary)_50%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--primary)_22%,transparent)]';

  const bodyWrapperClass = theme === 'dark' ? 'max-h-[65vh] overflow-auto' : '';

  return (
    <section className={wrapperClass}>
      <div className={headerClass}>
        <span>{config.title ?? 'prompt'}</span>
        <div className="widget-actions">
          <button onClick={handleCopy} className={copyBtnClass}>
            Copier
          </button>
          <button onClick={handleReset} className={resetBtnClass}>
            Réinitialiser
          </button>
        </div>
      </div>

      <div className={bodyWrapperClass}>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={Math.max(6, Math.ceil(prompt.length / 80))}
          className={textareaClass}
          style={theme === 'dark' ? { width: '100%', border: 0 } : undefined}
        />
      </div>
    </section>
  );
}
