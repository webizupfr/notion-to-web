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
        'overflow-hidden rounded-[22px] border shadow-subtle',
        'border-slate-900/40 bg-slate-900 text-slate-50',
        wide ? 'px-0' : 'px-0',
        'py-0',
      ].join(' ');
    }
    return 'widget-surface px-4 py-4 space-y-3';
  }, [theme, wide]);

  const headerClass = theme === 'dark'
    ? 'flex items-center justify-between gap-3 border-b border-white/10 bg-slate-900/60 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300'
    : 'flex items-center justify-between text-xs text-slate-500';

  const copyBtnClass = theme === 'dark'
    ? 'rounded-full border border-white/10 px-3 py-1 text-[11px] font-medium text-slate-200 transition hover:border-white/30 hover:text-white'
    : 'inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600';

  const resetBtnClass = theme === 'dark'
    ? 'text-[11px] text-slate-300 hover:text-white'
    : 'text-xs text-slate-400 hover:text-slate-600';

  const textareaClass = theme === 'dark'
    ? [
        'w-full bg-transparent px-5 py-4',
        wide ? 'text-[1rem]' : 'text-[0.94rem]',
        'leading-[1.6] font-mono text-slate-50 placeholder:text-slate-400',
        'focus:outline-none focus:ring-2 focus:ring-white/10 min-h-[220px] resize-y',
      ].join(' ')
    : 'w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm leading-6 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100';

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
