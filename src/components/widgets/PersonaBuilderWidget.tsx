"use client";

import { useEffect, useMemo, useState } from "react";
import type { PersonaBuilderWidgetConfig, PersonaField } from "@/lib/widget-parser";

type Store = { profile: Record<string, string>; hypotheses: Record<string, string> };

const DEFAULT_TEMPLATE = `# Fiche persona — {NOM_PERSONA}

## Profil rapide
{profil}

## Contexte typique
{contexte}

## Ce qu’il fait (observable)
{comportement}

## Ce qu’il ressent / dit (verbatims)
{ressenti}

## Ce qu’il essaie déjà (contournements)
{essais}

---
## Hypothèses à vérifier
### Ce qu’il cherche
{cherche}

### Ce qui le bloque
{bloque}

### Ce qu’on croit de lui (biais)
{croyances}
`;

export function PersonaBuilderWidget({ config, storageKey }: { config: PersonaBuilderWidgetConfig; storageKey: string }) {
  const profileFields: PersonaField[] = useMemo(() => config.profile?.fields ?? [
    { id: 'profil', label: 'Profil' },
    { id: 'contexte', label: 'Contexte typique' },
    { id: 'comportement', label: 'Ce qu’il fait' },
    { id: 'ressenti', label: 'Ce qu’il ressent / dit' },
    { id: 'essais', label: 'Ce qu’il essaie déjà' },
  ], [config.profile]);
  const hypoFields: PersonaField[] = useMemo(() => config.hypotheses?.fields ?? [
    { id: 'cherche', label: 'Ce qu’il cherche' },
    { id: 'bloque', label: 'Ce qui le bloque' },
    { id: 'croyances', label: 'Ce qu’on croit de lui (biais)' },
  ], [config.hypotheses]);

  const [profile, setProfile] = useState<Record<string, string>>({});
  const [hypo, setHypo] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState<string>("");

  const storeKey = useMemo(() => `persona_builder::${storageKey}` , [storageKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Store & { name?: string };
        setProfile(parsed.profile ?? {});
        setHypo(parsed.hypotheses ?? {});
        if (parsed.name) setName(parsed.name);
      }
    } catch {/* ignore */}
    setMounted(true);
  }, [storeKey]);

  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(storeKey, JSON.stringify({ profile, hypotheses: hypo, name })); } catch {}
  }, [mounted, storeKey, profile, hypo, name]);

  const tmpl = config.template?.trim() || DEFAULT_TEMPLATE;

  const output = useMemo(() => {
    let out = tmpl;
    const replace = (key: string, val: string) => { out = out.replace(new RegExp(`\\{${key}\\}`, 'g'), val || ''); };
    replace('NOM_PERSONA', name || 'Persona');
    for (const f of profileFields) replace(f.id, (profile[f.id] ?? '').trim());
    for (const f of hypoFields) replace(f.id, (hypo[f.id] ?? '').trim());
    return out;
  }, [tmpl, name, profile, hypo, profileFields, hypoFields]);

  const copy = async () => { try { await navigator.clipboard.writeText(output); } catch {} };
  const download = () => {
    const blob = new Blob([output], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const base = (config.outputTitle ?? (name || 'fiche-persona'));
    a.download = `${base.replace(/\s+/g,'-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const reset = () => { setProfile({}); setHypo({}); setName(''); try { localStorage.removeItem(storeKey); } catch {} };

  return (
    <section className="widget-surface p-5 space-y-5">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-700">1) Qui vit le problème</div>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">Nom du persona</span>
            <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Ex: Clara (alternante)" className="w-full rounded-xl border bg-white/90 px-3 py-2 text-sm" />
          </label>
          {profileFields.map((f) => (
            <label key={f.id} className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">{f.label}</span>
              <textarea
                value={profile[f.id] ?? ''}
                onChange={(e)=>setProfile((p)=>({ ...p, [f.id]: e.target.value }))}
                placeholder={f.placeholder}
                rows={4}
                className="w-full rounded-xl border bg-white/90 px-3 py-2 text-sm"
              />
            </label>
          ))}
        </div>
        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-700">2) Nos hypothèses à vérifier</div>
          {hypoFields.map((f) => (
            <label key={f.id} className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">{f.label}</span>
              <textarea
                value={hypo[f.id] ?? ''}
                onChange={(e)=>setHypo((h)=>({ ...h, [f.id]: e.target.value }))}
                placeholder={f.placeholder}
                rows={4}
                className="w-full rounded-xl border bg-white/90 px-3 py-2 text-sm"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="widget-actions text-xs text-slate-500">
        <button onClick={copy} className="btn btn-ghost text-xs">Copier la fiche</button>
        <button onClick={download} className="btn btn-ghost text-xs">Télécharger</button>
        <button onClick={reset} className="btn btn-ghost text-xs">Réinitialiser</button>
      </div>

      <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aperçu de la fiche</div>
        <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-800">{output}</pre>
      </div>
    </section>
  );
}
