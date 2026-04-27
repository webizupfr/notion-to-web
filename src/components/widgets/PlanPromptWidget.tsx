"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlanPromptWidgetConfig } from "@/lib/widget-parser";

export function PlanPromptWidget({ config, storageKey }: { config: PlanPromptWidgetConfig; storageKey: string }) {
  const scope = useMemo(() => storageKey.split('::')[0], [storageKey]);
  const sourceKey = useMemo(() => `plan_table::${scope}::${config.sourceAlias}`, [scope, config.sourceAlias]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [appName, setAppName] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

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
    setMounted(true);
  }, [sourceKey, storageKey]);

  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(`plan_prompt::${storageKey}::appname`, appName); } catch {}
  }, [mounted, appName, storageKey]);

  const a1 = answers[0] || "(fonctionnalité principale)";
  const a2 = answers[1] || "(résultat utilisateur)";

  const prompt = `Agis comme un Product Manager. Aide-moi à planifier une application appelée "${appName || '(Nom de l\'app)'}".

Idée centrale :
${a1}

L'utilisateur doit pouvoir :
${a2}

Merci de créer :
- Une définition claire du MVP (ce qu'il faut construire en premier)
- Une décomposition des fonctionnalités (MVP vs évolutions futures)
- Des user stories simples pour le MVP
- Les exigences techniques de base`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const found = answers.filter((a) => a && a.trim()).length > 0;

  return (
    <section className="widget-shell">
      <div className="widget-header">
        <p className="widget-header__eyebrow">Prompt · Plan PM</p>
        <h3 className="widget-header__title">
          {config.title ?? "Prompt — PM à partir de la checklist"}
        </h3>
        <p className="widget-header__desc">
          Génère un prompt prêt à coller dans ton IA préférée à partir des
          réponses saisies dans la checklist liée.
        </p>
      </div>

      {mounted && !found ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[var(--r-m)] border border-[color:var(--signal-warning)] bg-[color:var(--signal-warning-bg)] px-[var(--space-md)] py-[var(--space-sm)] text-[0.92rem] leading-[1.55] text-[color:var(--text-primary)]"
        >
          <span aria-hidden className="mt-[2px] text-lg leading-none">⚠</span>
          <div>
            <strong className="font-semibold">Checklist liée vide.</strong>{" "}
            Remplis d&apos;abord le widget plan_table avec l&apos;alias{" "}
            <code className="rounded-[var(--r-s)] bg-[color:var(--surface-2)] px-1 py-[1px] font-[family-name:var(--font-mono)] text-[0.85em]">
              {config.sourceAlias}
            </code>{" "}
            — le prompt affiche des placeholders tant qu&apos;il n&apos;a pas de données.
          </div>
        </div>
      ) : null}

      <label className="block">
        <span className="widget-label">Nom de l&apos;app</span>
        <input
          value={appName}
          onChange={(e) => setAppName(e.target.value)}
          placeholder="Ex: Ice-Breaker Generator"
        />
      </label>

      <div className="widget-preview">
        <div className="flex items-center justify-between">
          <span className="widget-preview__label">Prompt généré</span>
          <span
            className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
            role="status"
            aria-live="polite"
          >
            {copied ? "Copié ✓" : ""}
          </span>
        </div>
        <pre className="m-0 whitespace-pre-wrap text-[0.92rem] leading-[1.55] text-[color:var(--text-primary)] font-[family-name:var(--font-mono)]">
          <code>{prompt}</code>
        </pre>
      </div>

      <div className="widget-actions">
        <button onClick={copy} className="btn btn-primary text-xs">
          Copier le prompt
        </button>
      </div>
    </section>
  );
}
