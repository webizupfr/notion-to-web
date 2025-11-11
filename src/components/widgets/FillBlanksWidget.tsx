"use client";

import { useEffect, useMemo, useState, memo } from "react";
import type { FillBlanksWidgetConfig } from "@/lib/widget-parser";

type Segment = { type: 'text'; text: string } | { type: 'field'; name: string; label?: string };

function parseSegments(template: string, fields: { name: string; label?: string }[]): Segment[] {
  // Prefer [label] for UX. Also support {NAME} placeholders.
  const mapLabelToName = new Map<string, string>();
  for (const f of fields) if (f.label) mapLabelToName.set(f.label, f.name);

  const segments: Segment[] = [];
  let i = 0;
  while (i < template.length) {
    const idxB = template.indexOf('[', i);
    const idxC = template.indexOf('{', i);
    const next = [idxB, idxC].filter((x) => x >= 0).sort((a, b) => a - b)[0] ?? -1;
    if (next < 0) {
      segments.push({ type: 'text', text: template.slice(i) });
      break;
    }
    if (next > i) segments.push({ type: 'text', text: template.slice(i, next) });
    const ch = template[next];
    if (ch === '[') {
      const end = template.indexOf(']', next + 1);
      if (end > next) {
        const raw = template.slice(next + 1, end).trim();
        const name = mapLabelToName.get(raw) || raw.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `field_${segments.length}`;
        segments.push({ type: 'field', name, label: raw });
        i = end + 1;
        continue;
      }
    }
    if (ch === '{') {
      const end = template.indexOf('}', next + 1);
      if (end > next) {
        const raw = template.slice(next + 1, end).trim();
        segments.push({ type: 'field', name: raw });
        i = end + 1;
        continue;
      }
    }
    // fallback advance
    segments.push({ type: 'text', text: template[next] });
    i = next + 1;
  }
  return segments;
}

const InlineInput = memo(function InlineInput({ name, value, placeholder, onChange }: { name: string; value: string; placeholder?: string; onChange: (v: string) => void }) {
  return (
    <input
      name={name}
      type="text"
      defaultValue={value}
      onInput={(e) => onChange((e.target as HTMLInputElement).value)}
      placeholder={placeholder ?? name}
      className="mx-1 inline-block min-w-[12ch] rounded-md border border-amber-300 bg-white/80 px-2 py-1 text-[0.95rem] italic outline-none focus:ring-2"
      spellCheck={false}
      autoComplete="off"
    />
  );
});

export function FillBlanksWidget({ config, storageKey }: { config: FillBlanksWidgetConfig; storageKey: string }) {
  const segments = useMemo(() => parseSegments(config.template, config.fields), [config.template, config.fields]);
  const names = useMemo(() => Array.from(new Set(segments.filter((s): s is Extract<Segment,{type:'field'}> => s.type==='field').map((s) => s.name))), [segments]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [capture, setCapture] = useState(false);

  useEffect(() => {
    const base: Record<string, string> = {};
    names.forEach((n) => (base[n] = ''));
    try {
      const saved = localStorage.getItem(`fill_blanks::${storageKey}`);
      const parsed = saved ? (JSON.parse(saved) as Record<string, string>) : {};
      setValues({ ...base, ...parsed });
    } catch {
      setValues(base);
    }
  }, [names, storageKey]);

  const setVal = (name: string, v: string) => {
    setValues((prev) => {
      const next = { ...prev, [name]: v };
      try { localStorage.setItem(`fill_blanks::${storageKey}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const copy = async () => {
    const out = segments.map((seg) => seg.type === 'text' ? seg.text : (values[seg.name] || `[${seg.label ?? seg.name}]`)).join('');
    try { await navigator.clipboard.writeText(out); } catch {}
  };

  const renderInput = (name: string, label?: string) => (
    <InlineInput
      key={`f:${name}`}
      name={name}
      value={values[name] ?? ''}
      onChange={(v) => setVal(name, v)}
      placeholder={label}
    />
  );

  return (
    <section className="widget-surface p-5 space-y-4">
      {config.title ? <h3 className="text-lg font-semibold">{config.title}</h3> : null}
      <p className="text-sm text-slate-600">Remplis les blancs puis passe en « Mode capture » pour prendre une capture d’écran.</p>

      {!capture ? (
        <blockquote className="rounded-2xl border bg-white/85 p-4 text-[1.05rem] leading-[1.75] whitespace-pre-wrap">
          {segments.map((seg, idx) => (
            seg.type === 'text'
              ? <span key={`t:${idx}`}>{seg.text}</span>
              : renderInput(seg.name, seg.label)
          ))}
        </blockquote>
      ) : (
        <blockquote className="rounded-2xl border bg-white p-6 text-[1.15rem] leading-[1.75] whitespace-pre-wrap">
          {segments.map((seg, idx) => {
            if (seg.type === 'text') return <span key={idx}>{seg.text}</span>;
            const v = values[seg.name];
            return <em key={idx} className="italic not-italic font-medium">{v && v.trim() ? v : (seg.label ?? seg.name)}</em>;
          })}
        </blockquote>
      )}

      <div className="flex items-center justify-end gap-2">
        <button onClick={() => setCapture((v) => !v)} className="btn btn-ghost text-xs">{capture ? 'Quitter le mode capture' : 'Mode capture'}</button>
        <button onClick={copy} className="btn btn-primary text-xs">Copier le texte</button>
      </div>
    </section>
  );
}
