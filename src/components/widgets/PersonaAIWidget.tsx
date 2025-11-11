"use client";

import { useEffect, useMemo, useState } from "react";
import type { PersonaAIWidgetConfig } from "@/lib/widget-parser";

export function PersonaAIWidget({ config, storageKey }: { config: PersonaAIWidgetConfig; storageKey: string }) {
  const scope = useMemo(() => storageKey.split('::')[0], [storageKey]);
  const profileKey = useMemo(() => `form::${scope}::${config.profileAlias}`, [scope, config.profileAlias]);
  const hypoKey = useMemo(() => `form::${scope}::${config.hypothesesAlias}`, [scope, config.hypothesesAlias]);

  const [profile, setProfile] = useState<Record<string, string>>({});
  const [hypo, setHypo] = useState<Record<string, string>>({});

  useEffect(() => {
    try { const raw = localStorage.getItem(profileKey); if (raw) setProfile(JSON.parse(raw)); } catch {}
    try { const raw = localStorage.getItem(hypoKey); if (raw) setHypo(JSON.parse(raw)); } catch {}
  }, [profileKey, hypoKey]);

  const draftSheet = useMemo(() => {
    const get = (k: string) => (profile[k] ?? '').trim();
    const getH = (k: string) => (hypo[k] ?? '').trim();
    return [
      `# Fiche persona — (draft)`,
      `\n## Profil rapide\n${get('profil')}`,
      `\n## Contexte typique\n${get('contexte')}`,
      `\n## Ce qu’il fait (observable)\n${get('comportement')}`,
      `\n## Ce qu’il ressent / dit\n${get('ressenti')}`,
      `\n## Ce qu’il essaie déjà\n${get('essais')}`,
      `\n---\n## Hypothèses à vérifier`,
      `\n### Ce qu’il cherche\n${getH('cherche')}`,
      `\n### Ce qui le bloque\n${getH('bloque')}`,
      `\n### Ce qu’on croit de lui (biais)\n${getH('croyances')}`,
    ].join('\n');
  }, [profile, hypo]);

  const blindSpots = useMemo(() => {
    const missing: string[] = [];
    const need = ['profil','contexte','comportement','ressenti','essais'];
    for (const k of need) if (!(profile[k] ?? '').trim()) missing.push(k);
    const needH = ['cherche','bloque','croyances'];
    for (const k of needH) if (!(hypo[k] ?? '').trim()) missing.push(k);
    return missing;
  }, [profile, hypo]);

  const challengePrompt = useMemo(() => {
    return `Tu es un coach UX. Analyse le persona et challenge les hypothèses.\n\n`+
      `# PROFIL\n`+
      `Profil: ${profile.profil || ''}\n`+
      `Contexte: ${profile.contexte || ''}\n`+
      `Comportement: ${profile.comportement || ''}\n`+
      `Ressenti: ${profile.ressenti || ''}\n`+
      `Déjà essayé: ${profile.essais || ''}\n\n`+
      `# HYPOTHÈSES\n`+
      `Cherche: ${hypo.cherche || ''}\n`+
      `Bloque: ${hypo.bloque || ''}\n`+
      `Croyances/biais: ${hypo.croyances || ''}\n\n`+
      `## Ce que j’attends\n`+
      `1) Angles morts (éléments manquants/ambigus)\n`+
      `2) Questions d’entretien ciblées pour les vérifier\n`+
      `3) Une fiche persona réécrite plus claire (markdown)\n`;
  }, [profile, hypo]);

  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); } catch {} };

  return (
    <section className="widget-surface p-5 space-y-5">
      <div className="text-sm font-semibold">🧠 Espace IA — challenger & compléter</div>

      {blindSpots.length ? (
        <div className="rounded-xl border bg-white/70 px-3 py-2 text-sm text-slate-700">
          Champs manquants/à préciser: {blindSpots.join(', ')}
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prompt IA (à coller dans ton chat)</div>
          <div className="widget-actions text-xs"><button onClick={()=>copy(challengePrompt)} className="btn btn-ghost text-xs">Copier</button></div>
        </div>
        <pre className="code-block rounded-2xl border bg-white/80 p-4 text-[0.95rem] leading-[1.5] whitespace-pre-wrap"><code>{challengePrompt}</code></pre>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fiche (draft) générée à partir de tes entrées</div>
          <div className="widget-actions text-xs"><button onClick={()=>copy(draftSheet)} className="btn btn-ghost text-xs">Copier</button></div>
        </div>
        <pre className="code-block rounded-2xl border bg-white/80 p-4 text-[0.95rem] leading-[1.5] whitespace-pre-wrap"><code>{draftSheet}</code></pre>
      </div>
    </section>
  );
}

