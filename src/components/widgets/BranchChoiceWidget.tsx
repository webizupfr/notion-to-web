"use client";

import { useEffect, useMemo, useState } from "react";
import type { BranchChoiceWidgetConfig } from "@/lib/widget-parser";

function ensurePath(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return "/";
  if (trimmed.startsWith("http")) return trimmed; // allow full URLs if needed
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function BranchChoiceWidget({ config, storageKey }: { config: BranchChoiceWidgetConfig; storageKey: string }) {
  // Derive page slug from storageKey "<slug>::<blockId>"
  const pageSlug = useMemo(() => storageKey.split("::")[0] ?? "", [storageKey]);
  const branchKey = useMemo(() => `branch_next_href::${pageSlug}`, [pageSlug]);

  const [selectedHref, setSelectedHref] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(branchKey);
      if (saved) setSelectedHref(saved);
    } catch {
      // ignore
    }
    setMounted(true);
  }, [branchKey]);

  useEffect(() => {
    if (!mounted) return;
    try {
      if (selectedHref) localStorage.setItem(branchKey, selectedHref);
    } catch {
      // ignore
    }
  }, [mounted, branchKey, selectedHref]);

  const handleSelect = (hrefOrId: string, byActivityId?: boolean) => {
    const path = byActivityId
      ? ensurePath(`${pageSlug.startsWith('/') ? '' : '/'}${pageSlug}?activity=${hrefOrId}#steps`)
      : ensurePath(hrefOrId);
    setSelectedHref(path);
  };

  const handleReset = () => {
    setSelectedHref(null);
    try {
      localStorage.removeItem(branchKey);
    } catch {}
  };

  return (
    <section className="space-y-4 widget-surface px-5 py-6">
      <p className="text-sm font-medium text-slate-700">{config.question}</p>

      <div className="space-y-3">
        {config.options.map((opt, idx) => {
          const path = opt.href
            ? ensurePath(opt.href)
            : opt.activityId
            ? ensurePath(`${pageSlug.startsWith('/') ? '' : '/'}${pageSlug}?activity=${opt.activityId}#steps`)
            : '#';
          const isActive = selectedHref === path;
          return (
            <button
              key={`${storageKey}-opt-${idx}`}
              type="button"
              onClick={() => handleSelect(opt.href ?? (opt.activityId as string), Boolean(!opt.href && opt.activityId))}
              className={`w-full rounded-2xl border px-4 py-4 text-left transition hover:-translate-y-0.5 hover:shadow ${
                isActive ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold">
                  {String.fromCharCode(65 + idx)}
                </span>
                <div className="space-y-1 text-sm leading-6 text-slate-800">
                  <div className="font-medium">{opt.label}</div>
                  {opt.description ? <div className="text-slate-600 whitespace-pre-wrap">{opt.description}</div> : null}
                  <div className="text-xs text-slate-400">→ {path}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="widget-actions text-xs text-slate-500">
        <a
          href={selectedHref ?? '#'}
          className={`btn btn-primary text-xs ${selectedHref ? '' : 'pointer-events-none opacity-50'}`}
          aria-disabled={!selectedHref}
        >
          Continuer →
        </a>
        <button onClick={handleReset} className="btn btn-ghost text-xs">Réinitialiser</button>
      </div>
    </section>
  );
}
