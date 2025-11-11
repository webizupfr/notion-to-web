"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlanPromptWidgetConfig } from "@/lib/widget-parser";

export function PlanPromptWidget({ config, storageKey }: { config: PlanPromptWidgetConfig; storageKey: string }) {
  const scope = useMemo(() => storageKey.split('::')[0], [storageKey]);
  const sourceKey = useMemo(() => `plan_table::${scope}::${config.sourceAlias}`, [scope, config.sourceAlias]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [appName, setAppName] = useState<string>("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(sourceKey);
      const arr = saved ? (JSON.parse(saved) as string[]) : [];
      if (Array.isArray(arr)) setAnswers(arr);
    } catch {}
    try {
      const savedName = localStorage.getItem(`plan_prompt::${storageKey}::appname`);
      if (savedName) setAppName(savedName);
    } catch {}
  }, [sourceKey, storageKey]);

  useEffect(() => {
    try { localStorage.setItem(`plan_prompt::${storageKey}::appname`, appName); } catch {}
  }, [appName, storageKey]);

  const a1 = answers[0] || "(fonctionnalité principale)";
  const a2 = answers[1] || "(résultat utilisateur)";

  const prompt = `Agis comme un Product Manager. Aide-moi à planifier une application appelée "${appName || '(Nom de l\'app)'}".

Idée centrale :
${a1}

L’utilisateur doit pouvoir :
${a2}

Merci de créer :
- Une définition claire du MVP (ce qu’il faut construire en premier)
- Une décomposition des fonctionnalités (MVP vs évolutions futures)
- Des user stories simples pour le MVP
- Les exigences techniques de base`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(prompt); } catch {}
  };

  const found = answers.length > 0;

  return (
    <section className="widget-surface p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{config.title ?? 'Prompt — PM à partir de la checklist'}</h3>
        <button onClick={copy} className="btn btn-primary text-xs">Copier</button>
      </div>
      {!found ? (
        <div className="rounded-xl border bg-yellow-50/80 p-3 text-sm text-slate-700">
          Aucune réponse trouvée pour l’alias « {config.sourceAlias} ». Remplis d’abord la checklist associée (widget plan_table avec alias identique).
        </div>
      ) : null}

      <label className="block space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Nom de l’app</span>
        <input
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
          placeholder="Ex: Ice‑Breaker Generator"
          className="w-full rounded-lg border bg-white/80 px-3 py-2 text-sm"
        />
      </label>

      <pre className="code-block rounded-2xl border bg-white/80 p-4 text-[0.95rem] leading-[1.5] whitespace-pre-wrap">
        <code>{prompt}</code>
      </pre>
    </section>
  );
}
