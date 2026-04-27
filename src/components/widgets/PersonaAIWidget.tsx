"use client";

import { useEffect, useMemo, useState } from "react";
import type { PersonaAIWidgetConfig } from "@/lib/widget-parser";
import { useCopy, copyFeedbackLabel } from "./useCopy";

export function PersonaAIWidget({
  config,
  storageKey,
}: {
  config: PersonaAIWidgetConfig;
  storageKey: string;
}) {
  const scope = useMemo(() => storageKey.split("::")[0], [storageKey]);
  const profileKey = useMemo(
    () => `form::${scope}::${config.profileAlias}`,
    [scope, config.profileAlias],
  );
  const hypoKey = useMemo(
    () => `form::${scope}::${config.hypothesesAlias}`,
    [scope, config.hypothesesAlias],
  );

  const [profile, setProfile] = useState<Record<string, string>>({});
  const [hypo, setHypo] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(profileKey);
      if (raw) setProfile(JSON.parse(raw));
    } catch { /* ignore */ }
    try {
      const raw = localStorage.getItem(hypoKey);
      if (raw) setHypo(JSON.parse(raw));
    } catch { /* ignore */ }
    setMounted(true);
  }, [profileKey, hypoKey]);

  const draftSheet = useMemo(() => {
    const get = (k: string) => (profile[k] ?? "").trim();
    const getH = (k: string) => (hypo[k] ?? "").trim();
    return [
      `# Fiche persona — (draft)`,
      `\n## Profil rapide\n${get("profil")}`,
      `\n## Contexte typique\n${get("contexte")}`,
      `\n## Ce qu'il fait (observable)\n${get("comportement")}`,
      `\n## Ce qu'il ressent / dit\n${get("ressenti")}`,
      `\n## Ce qu'il essaie déjà\n${get("essais")}`,
      `\n---\n## Hypothèses à vérifier`,
      `\n### Ce qu'il cherche\n${getH("cherche")}`,
      `\n### Ce qui le bloque\n${getH("bloque")}`,
      `\n### Ce qu'on croit de lui (biais)\n${getH("croyances")}`,
    ].join("\n");
  }, [profile, hypo]);

  const blindSpots = useMemo(() => {
    const missing: string[] = [];
    const need = ["profil", "contexte", "comportement", "ressenti", "essais"];
    for (const k of need) if (!(profile[k] ?? "").trim()) missing.push(k);
    const needH = ["cherche", "bloque", "croyances"];
    for (const k of needH) if (!(hypo[k] ?? "").trim()) missing.push(k);
    return missing;
  }, [profile, hypo]);

  const challengePrompt = useMemo(() => {
    return (
      `Tu es un coach UX. Analyse le persona et challenge les hypothèses.\n\n` +
      `# PROFIL\n` +
      `Profil: ${profile.profil || ""}\n` +
      `Contexte: ${profile.contexte || ""}\n` +
      `Comportement: ${profile.comportement || ""}\n` +
      `Ressenti: ${profile.ressenti || ""}\n` +
      `Déjà essayé: ${profile.essais || ""}\n\n` +
      `# HYPOTHÈSES\n` +
      `Cherche: ${hypo.cherche || ""}\n` +
      `Bloque: ${hypo.bloque || ""}\n` +
      `Croyances/biais: ${hypo.croyances || ""}\n\n` +
      `## Ce que j'attends\n` +
      `1) Angles morts (éléments manquants/ambigus)\n` +
      `2) Questions d'entretien ciblées pour les vérifier\n` +
      `3) Une fiche persona réécrite plus claire (markdown)\n`
    );
  }, [profile, hypo]);

  const promptCopy = useCopy();
  const sheetCopy = useCopy();

  const hasData = Object.keys(profile).length > 0 || Object.keys(hypo).length > 0;

  return (
    <section className="widget-shell">
      <div className="widget-header">
        <p className="widget-header__eyebrow">Espace IA · Challenger</p>
        <h3 className="widget-header__title">Challenger et compléter ton persona</h3>
        <p className="widget-header__desc">
          Copie le prompt ou la fiche générée pour faire challenger ton persona
          par une IA.
        </p>
      </div>

      {mounted && !hasData ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[var(--r-m)] border border-[color:var(--signal-warning)] bg-[color:var(--signal-warning-bg)] px-[var(--space-md)] py-[var(--space-sm)] text-[0.92rem] leading-[1.55] text-[color:var(--text-primary)]"
        >
          <span aria-hidden className="mt-[2px] text-lg leading-none">⚠</span>
          <div>
            Remplis d&apos;abord les formulaires{" "}
            <code className="rounded-[var(--r-s)] bg-[color:var(--surface-2)] px-1 py-[1px] font-[family-name:var(--font-mono)] text-[0.85em]">
              {config.profileAlias}
            </code>{" "}
            et{" "}
            <code className="rounded-[var(--r-s)] bg-[color:var(--surface-2)] px-1 py-[1px] font-[family-name:var(--font-mono)] text-[0.85em]">
              {config.hypothesesAlias}
            </code>
            . Ensuite, cette fiche se génère automatiquement.
          </div>
        </div>
      ) : null}

      {mounted && blindSpots.length ? (
        <div className="rounded-[var(--r-m)] border border-dashed border-[color:var(--border-subtle)] bg-[color:var(--surface-2)] px-[var(--space-md)] py-[var(--space-sm)] text-[0.92rem] text-[color:var(--text-secondary)]">
          <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]">
            Champs à préciser
          </span>
          <div className="mt-1">{blindSpots.join(" · ")}</div>
        </div>
      ) : null}

      <div className="widget-preview">
        <div className="flex items-center justify-between">
          <span className="widget-preview__label">Prompt IA — à coller</span>
          <span
            className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
            role="status"
            aria-live="polite"
          >
            {copyFeedbackLabel(promptCopy.status)}
          </span>
        </div>
        <pre className="m-0 whitespace-pre-wrap text-[0.92rem] leading-[1.55] text-[color:var(--text-primary)] font-[family-name:var(--font-mono)]">
          <code>{challengePrompt}</code>
        </pre>
        <div className="widget-actions">
          <button onClick={() => promptCopy.copy(challengePrompt)} className="btn btn-ghost text-xs">
            Copier le prompt
          </button>
        </div>
      </div>

      <div className="widget-preview">
        <div className="flex items-center justify-between">
          <span className="widget-preview__label">Fiche draft</span>
          <span
            className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
            role="status"
            aria-live="polite"
          >
            {copyFeedbackLabel(sheetCopy.status)}
          </span>
        </div>
        <pre className="m-0 whitespace-pre-wrap text-[0.92rem] leading-[1.55] text-[color:var(--text-primary)] font-[family-name:var(--font-mono)]">
          <code>{draftSheet}</code>
        </pre>
        <div className="widget-actions">
          <button onClick={() => sheetCopy.copy(draftSheet)} className="btn btn-ghost text-xs">
            Copier la fiche
          </button>
        </div>
      </div>
    </section>
  );
}
