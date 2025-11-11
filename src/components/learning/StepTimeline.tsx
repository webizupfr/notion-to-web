"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { ActivityStep } from "@/lib/types";

type Props = {
  steps: ActivityStep[];
  basePath: string;
  activeIndex: number;
  allowManualToggle?: boolean;
  showCountLabel?: boolean;
  mode?: 'full' | 'numbers';
};

export function StepTimeline({ steps, basePath, activeIndex, allowManualToggle = false, showCountLabel = true, mode = 'full' }: Props) {
  const router = useRouter();
  const [done, setDone] = useState<Record<string, boolean>>({});

  const storageKey = useMemo(() => `sprint_progress::${basePath}`, [basePath]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setDone(JSON.parse(raw));
    } catch {/* ignore */}
  }, [storageKey]);

  const persist = (next: Record<string, boolean>) => {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {/* ignore */}
  };

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      persist(next);
      return next;
    });
  };

  const go = (index: number) => {
    const target = Math.min(Math.max(index, 0), steps.length - 1);
    const url = target === 0 ? `${basePath}#steps` : `${basePath}?step=${target + 1}#steps`;
    router.push(url);
  };

  if (mode === 'numbers') {
    return (
      <aside className="sticky top-24 hidden md:block w-10">
        {showCountLabel ? (
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-center">
            {steps.length}
          </div>
        ) : null}
        <ol className="relative ml-5 border-l border-slate-200 pl-0">
          {steps.map((s, i) => {
            const active = i === activeIndex;
            const isDone = !!done[s.id];
            const base = 'inline-flex items-center justify-center rounded-full border text-[11px] h-6 w-6 transition';
            const cls = active
              ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm'
              : isDone
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50';
            return (
              <li key={s.id} className="mb-3">
                <button
                  aria-label={s.title}
                  title={s.title}
                  onClick={() => go(i)}
                  className={`${base} ${cls} absolute -left-4`}
                >
                  {i + 1}
                </button>
                {/* spacer to ensure li has height aligning with the circle */}
                <div className="h-6" />
              </li>
            );
          })}
        </ol>
      </aside>
    );
  }

  return (
    <aside className="sticky top-24 hidden md:block">
      {showCountLabel ? (
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Étapes ({steps.length})
        </div>
      ) : null}
      <ol className="relative ml-2 border-l border-slate-200 pl-4">
        {steps.map((s, i) => {
          const active = i === activeIndex;
          const isDone = !!done[s.id];
          return (
            <li key={s.id} className="mb-3">
              <div className="absolute -left-[7px] mt-[6px] h-2.5 w-2.5 rounded-full" style={{ background: active ? '#10b981' : '#cbd5e1' }} />
              <div className="flex items-center gap-3">
                {allowManualToggle ? (
                  <button
                    className={`h-4 w-4 rounded-md border ${isDone ? 'bg-emerald-100 border-emerald-300' : 'bg-white hover:bg-slate-50'}`}
                    onClick={() => toggle(s.id)}
                    aria-checked={isDone}
                    title={isDone ? 'Marquée comme faite' : 'Marquer comme faite'}
                  >
                    {isDone ? '✓' : ''}
                  </button>
                ) : (
                  <span className={`inline-flex h-4 w-4 items-center justify-center rounded-md border text-[11px] ${isDone ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-white text-transparent'}`}>
                    ✓
                  </span>
                )}
                <button
                  className={`truncate text-left text-[15px] ${active ? 'font-semibold text-slate-900' : 'text-slate-600 hover:text-slate-800'}`}
                  onClick={() => go(i)}
                  title={s.title}
                >
                  {s.title}
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
