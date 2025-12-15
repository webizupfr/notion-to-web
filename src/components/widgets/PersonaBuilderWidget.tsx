"use client";

import { useEffect, useMemo, useState } from "react";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
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
    <section className="surface-card space-y-[var(--space-m)]">
      <header className="space-y-[var(--space-xs)]">
        <Heading level={3}>📓 Fiche persona (builder)</Heading>
        <Text variant="muted">Renseigne le profil et les hypothèses pour générer une fiche prête à partager.</Text>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <Heading level={3}>1) Qui vit le problème</Heading>
          <label className="block space-y-1">
            <Text variant="small" className="font-medium text-[color:var(--muted)]">Nom du persona</Text>
            <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Ex: Clara (alternante)" className="w-full rounded-[var(--r-lg)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] px-[var(--space-3)] py-[var(--space-2)] text-sm text-[color:var(--fg)] shadow-sm focus:border-[color-mix(in_oklab,var(--primary)_50%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--primary)_22%,transparent)]" />
          </label>
          {profileFields.map((f) => (
            <label key={f.id} className="block space-y-1">
              <Text variant="small" className="font-medium text-[color:var(--muted)]">{f.label}</Text>
              <textarea
                value={profile[f.id] ?? ''}
                onChange={(e)=>setProfile((p)=>({ ...p, [f.id]: e.target.value }))}
                placeholder={f.placeholder}
                rows={4}
                className="w-full rounded-[var(--r-lg)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] px-[var(--space-3)] py-[var(--space-2)] text-sm text-[color:var(--fg)] shadow-sm focus:border-[color-mix(in_oklab,var(--primary)_50%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--primary)_22%,transparent)]"
              />
            </label>
          ))}
        </div>
        <div className="space-y-3">
          <Heading level={3}>2) Nos hypothèses à vérifier</Heading>
          {hypoFields.map((f) => (
            <label key={f.id} className="block space-y-1">
              <Text variant="small" className="font-medium text-[color:var(--muted)]">{f.label}</Text>
              <textarea
                value={hypo[f.id] ?? ''}
                onChange={(e)=>setHypo((h)=>({ ...h, [f.id]: e.target.value }))}
                placeholder={f.placeholder}
                rows={4}
                className="w-full rounded-[var(--r-lg)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] px-[var(--space-3)] py-[var(--space-2)] text-sm text-[color:var(--fg)] shadow-sm focus:border-[color-mix(in_oklab,var(--primary)_50%,transparent)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--primary)_22%,transparent)]"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="widget-actions text-xs text-[color:var(--muted)]">
        <button onClick={copy} className="btn btn-ghost text-xs">Copier la fiche</button>
        <button onClick={download} className="btn btn-ghost text-xs">Télécharger</button>
        <button onClick={reset} className="btn btn-ghost text-xs">Réinitialiser</button>
      </div>

      <div className="surface-panel space-y-[var(--space-xs)]">
        <Text variant="small" className="uppercase tracking-[0.12em] text-[color:var(--muted)]">Aperçu de la fiche</Text>
        <pre className="notion-codeblock whitespace-pre-wrap"><code>{output}</code></pre>
      </div>
    </section>
  );
}
