"use client";

import { useEffect, useMemo, useState } from "react";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
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
    <section className="surface-card space-y-[var(--space-m)]">
      <div className="flex items-center justify-between">
        <Heading level={3} className="text-[1.12rem] leading-[1.3]">
          {config.title ?? 'Prompt — PM à partir de la checklist'}
        </Heading>
        <button onClick={copy} className="btn btn-primary text-xs">Copier</button>
      </div>
      {!found ? (
        <Text
          variant="small"
          className="rounded-[var(--r-lg)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--warning)_14%,var(--bg))] p-[var(--space-3)] text-[color:var(--fg)] shadow-sm"
        >
          Aucune réponse trouvée pour l’alias « {config.sourceAlias} ». Remplis d’abord la checklist associée (widget plan_table avec alias identique).
        </Text>
      ) : null}

      <label className="block space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">Nom de l’app</span>
        <input
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
          placeholder="Ex: Ice‑Breaker Generator"
          className="w-full rounded-[var(--r-md)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] px-[var(--space-3)] py-[var(--space-2)] text-sm text-[color:var(--fg)] shadow-sm focus:border-[color-mix(in_oklab,var(--primary)_50%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--primary)_22%,transparent)]"
        />
      </label>

      <pre className="code-block rounded-[var(--r-xl)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] p-[var(--space-4)] text-[0.95rem] leading-[1.5] whitespace-pre-wrap text-[color:var(--fg)] shadow-sm">
        <code>{prompt}</code>
      </pre>
    </section>
  );
}
