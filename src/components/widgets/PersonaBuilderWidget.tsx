"use client";

import { useEffect, useMemo, useState } from "react";
import { Heading } from "@/components/ui/Heading";
import type { PersonaBuilderWidgetConfig, PersonaField } from "@/lib/widget-parser";
import { useCopy, copyFeedbackLabel } from "./useCopy";

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

  const { copy, status: copyStatus } = useCopy();
  const handleCopy = () => copy(output);
  const download = () => {
    const blob = new Blob([output], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const rawBase = config.outputTitle ?? name ?? 'fiche-persona';
    const slug = rawBase
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "fiche-persona";
    a.download = `${slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const reset = () => { setProfile({}); setHypo({}); setName(''); try { localStorage.removeItem(storeKey); } catch {} };

  return (
    <section className="widget-shell">
      <div className="widget-header">
        <p className="widget-header__eyebrow">Fiche persona · Builder</p>
        <h3 className="widget-header__title">Construire sa fiche persona</h3>
        <p className="widget-header__desc">
          Renseigne le profil et les hypothèses pour générer une fiche prête à
          partager.
        </p>
      </div>

      <div className="grid gap-[var(--space-lg)] md:grid-cols-2">
        <div className="space-y-[var(--space-sm)] min-w-0">
          <Heading level={3} className="text-[1rem]">1) Qui vit le problème</Heading>
          <label className="block">
            <span className="widget-label">Nom du persona</span>
            <input
              value={name}
              onChange={(e)=>setName(e.target.value)}
              placeholder="Ex: Clara (alternante)"
            />
          </label>
          {profileFields.map((f) => (
            <label key={f.id} className="block">
              <span className="widget-label">{f.label}</span>
              <textarea
                value={profile[f.id] ?? ''}
                onChange={(e)=>setProfile((p)=>({ ...p, [f.id]: e.target.value }))}
                placeholder={f.placeholder}
                rows={4}
              />
            </label>
          ))}
        </div>
        <div className="space-y-[var(--space-sm)] min-w-0">
          <Heading level={3} className="text-[1rem]">2) Nos hypothèses à vérifier</Heading>
          {hypoFields.map((f) => (
            <label key={f.id} className="block">
              <span className="widget-label">{f.label}</span>
              <textarea
                value={hypo[f.id] ?? ''}
                onChange={(e)=>setHypo((h)=>({ ...h, [f.id]: e.target.value }))}
                placeholder={f.placeholder}
                rows={4}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="widget-actions">
        <span
          className="mr-auto font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
          role="status"
          aria-live="polite"
        >
          {copyFeedbackLabel(copyStatus)}
        </span>
        <button onClick={handleCopy} className="btn btn-ghost text-xs">Copier la fiche</button>
        <button onClick={download} className="btn btn-ghost text-xs">Télécharger</button>
        <button onClick={reset} className="btn btn-ghost text-xs">Réinitialiser</button>
      </div>

      <div className="widget-preview">
        <span className="widget-preview__label">Aperçu de la fiche</span>
        <pre className="m-0 whitespace-pre-wrap text-[0.92rem] leading-[1.55] text-[color:var(--text-primary)] font-[family-name:var(--font-mono)]"><code>{output}</code></pre>
      </div>
    </section>
  );
}
