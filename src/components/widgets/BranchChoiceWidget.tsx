"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BranchChoiceWidgetConfig } from "@/lib/widget-parser";

function ensurePath(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return "/";
  if (trimmed.startsWith("http")) return trimmed;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function BranchChoiceWidget({ config, storageKey }: { config: BranchChoiceWidgetConfig; storageKey: string }) {
  const router = useRouter();
  const pageSlug = useMemo(() => storageKey.split("::")[0] ?? "", [storageKey]);
  const branchKey = useMemo(() => `branch_next_href::${pageSlug}`, [pageSlug]);

  const [selectedHref, setSelectedHref] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(branchKey);
      if (saved) setSelectedHref(saved);
    } catch { /* ignore */ }
    setMounted(true);
  }, [branchKey]);

  const persist = (href: string | null) => {
    try {
      if (href) localStorage.setItem(branchKey, href);
      else localStorage.removeItem(branchKey);
    } catch { /* ignore */ }
  };

  const handleSelect = (hrefOrId: string, byActivityId?: boolean) => {
    const path = byActivityId
      ? ensurePath(`${pageSlug.startsWith('/') ? '' : '/'}${pageSlug}?activity=${hrefOrId}#steps`)
      : ensurePath(hrefOrId);
    setSelectedHref(path);
    persist(path);
  };

  const handleContinue = () => {
    if (!selectedHref) return;
    persist(selectedHref);
    if (selectedHref.startsWith("http")) {
      window.location.assign(selectedHref);
    } else {
      router.push(selectedHref);
    }
  };

  const handleReset = () => {
    setSelectedHref(null);
    persist(null);
  };

  const hasOptions = config.options.length > 0;

  if (!mounted) {
    return (
      <section className="widget-shell" aria-busy="true">
        <div className="h-24 animate-pulse rounded-[var(--r-m)] bg-[color:var(--surface-2)]" />
      </section>
    );
  }

  return (
    <section className="widget-shell">
      <p className="m-0 text-[0.98rem] font-medium text-[color:var(--text-primary)]">{config.question}</p>

      {!hasOptions ? (
        <p className="m-0 text-sm text-[color:var(--text-tertiary)]">Aucune option configurée.</p>
      ) : (
        <div className="space-y-[var(--space-xs)]" role="radiogroup" aria-label={config.question}>
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
                role="radio"
                aria-checked={isActive}
                onClick={() => handleSelect(opt.href ?? (opt.activityId as string), Boolean(!opt.href && opt.activityId))}
                className={`w-full rounded-[var(--r-m)] border px-[var(--space-md)] py-[var(--space-sm)] text-left transition-colors ${
                  isActive
                    ? 'border-[color:var(--accent-edge)] bg-[color:var(--accent-bg)]'
                    : 'border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] hover:border-[color:var(--border-strong)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-[2px] inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-[var(--r-s)] border text-xs font-semibold font-[family-name:var(--font-mono)] ${
                      isActive
                        ? 'border-[color:var(--accent-edge)] bg-[color:var(--accent)] text-[color:var(--accent-ink)]'
                        : 'border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] text-[color:var(--text-secondary)]'
                    }`}
                    aria-hidden
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <div className="min-w-0 space-y-1 text-sm leading-6 text-[color:var(--text-primary)]">
                    <div className="font-medium">{opt.label}</div>
                    {opt.description ? (
                      <div className="text-[color:var(--text-secondary)] whitespace-pre-wrap">{opt.description}</div>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="widget-actions">
        <span
          className="mr-auto font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
          role="status"
          aria-live="polite"
        >
          {selectedHref ? "Choix enregistré" : "Sélectionne une option"}
        </span>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedHref}
          className="btn btn-primary text-xs"
          aria-disabled={!selectedHref}
        >
          Continuer →
        </button>
        <button type="button" onClick={handleReset} className="btn btn-ghost text-xs">
          Réinitialiser
        </button>
      </div>
    </section>
  );
}
