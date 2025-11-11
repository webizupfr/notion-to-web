"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { ActivityStep } from "@/lib/types";

type Props = {
  steps: ActivityStep[];
  basePath: string;
  centered?: boolean;
  showControlsTop?: boolean;
};

export function StepWizard({ steps, basePath, centered = true, showControlsTop = false }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const stepParam = sp.get("step");
  const index = useMemo(() => {
    const n = Number(stepParam);
    if (Number.isFinite(n) && n >= 1 && n <= steps.length) return n - 1;
    return 0;
  }, [stepParam, steps.length]);

  const step = steps[index];

  const go = (i: number) => {
    const target = Math.min(Math.max(i, 0), steps.length - 1);
    const url = target === 0 ? `${basePath}#steps` : `${basePath}?step=${target + 1}#steps`;
    router.push(url);
  };

  if (!steps.length) return null;

  return (
    <div className="space-y-3">
      <div className={`${centered ? 'flex flex-col items-center gap-2' : 'flex items-center justify-between'}`}>
        <div className={`${centered ? 'text-[11px]' : 'text-xs'} uppercase tracking-wide text-slate-500`}>Étape {index + 1} / {steps.length}</div>
        <div className={`flex flex-wrap gap-2 ${centered ? 'justify-center' : ''}`}>
          {steps.map((s, i) => (
            <button
              key={s.id}
              onClick={() => go(i)}
              title={s.title}
              aria-current={i === index ? 'step' : undefined}
              className={`h-8 w-8 rounded-full border text-[13px] leading-8 text-center transition ${i === index ? 'bg-emerald-100 border-emerald-300 font-semibold' : 'hover:bg-slate-100'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        {showControlsTop && (
          <div className="flex items-center gap-2">
            <button
              className="btn btn-ghost text-sm"
              onClick={() => go(index - 1)}
              disabled={index === 0}
            >
              ← Précédent
            </button>
            <button
              className="btn btn-primary text-sm"
              onClick={() => go(index + 1)}
              disabled={index >= steps.length - 1}
            >
              Suivant →
            </button>
          </div>
        )}
      </div>

      {/* Titre concis au-dessus du contenu, mais sans bande */}
      <div className={centered ? 'text-center' : ''}>
        <div className="text-[1.05rem] font-semibold text-slate-900">{step.title}</div>
        <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
          {(step.type ?? 'activité')}{step.duration ? ` · ${step.duration}` : ''}
        </div>
      </div>
    </div>
  );
}
