"use client";

import { useEffect, useMemo, useState, memo } from "react";
import type { FillBlanksWidgetConfig } from "@/lib/widget-parser";
import { useCopy, copyFeedbackLabel } from "./useCopy";

type Segment =
  | { type: "text"; text: string }
  | { type: "field"; name: string; label?: string };

function slugifyLabel(raw: string, fallback: string): string {
  const slug = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || fallback;
}

function parseSegments(template: string, fields: { name: string; label?: string }[]): Segment[] {
  const mapLabelToName = new Map<string, string>();
  for (const f of fields) if (f.label) mapLabelToName.set(f.label, f.name);

  const segments: Segment[] = [];
  let i = 0;
  let fieldCount = 0;

  while (i < template.length) {
    const idxB = template.indexOf("[", i);
    const idxC = template.indexOf("{", i);
    const candidates = [idxB, idxC].filter((x) => x >= 0).sort((a, b) => a - b);
    const next = candidates.length ? candidates[0] : -1;

    if (next < 0) {
      segments.push({ type: "text", text: template.slice(i) });
      break;
    }
    if (next > i) segments.push({ type: "text", text: template.slice(i, next) });

    const ch = template[next];
    const closeCh = ch === "[" ? "]" : "}";
    const end = template.indexOf(closeCh, next + 1);

    if (end < 0) {
      // unterminated → treat char as literal text
      segments.push({ type: "text", text: template[next] });
      i = next + 1;
      continue;
    }

    const raw = template.slice(next + 1, end).trim();
    if (!raw) {
      segments.push({ type: "text", text: template.slice(next, end + 1) });
      i = end + 1;
      continue;
    }

    const name =
      ch === "["
        ? (mapLabelToName.get(raw) ?? slugifyLabel(raw, `field_${fieldCount}`))
        : raw;
    segments.push({
      type: "field",
      name,
      label: ch === "[" ? raw : undefined,
    });
    fieldCount += 1;
    i = end + 1;
  }
  return segments;
}

const InlineInput = memo(function InlineInput({
  name,
  value,
  placeholder,
  onChange,
}: {
  name: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      name={name}
      type="text"
      defaultValue={value}
      onInput={(e) => onChange((e.target as HTMLInputElement).value)}
      placeholder={placeholder ?? name}
      className="mx-1 inline-block min-w-[12ch] max-w-full italic text-[0.95rem]"
      style={{
        padding: "2px 8px",
        borderRadius: "var(--r-s)",
      }}
      spellCheck={false}
      autoComplete="off"
      aria-label={placeholder ?? name}
    />
  );
});

export function FillBlanksWidget({
  config,
  storageKey,
}: {
  config: FillBlanksWidgetConfig;
  storageKey: string;
}) {
  const segments = useMemo(
    () => parseSegments(config.template, config.fields),
    [config.template, config.fields],
  );
  const names = useMemo(
    () =>
      Array.from(
        new Set(
          segments
            .filter((s): s is Extract<Segment, { type: "field" }> => s.type === "field")
            .map((s) => s.name),
        ),
      ),
    [segments],
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const [capture, setCapture] = useState(false);

  useEffect(() => {
    const base: Record<string, string> = {};
    names.forEach((n) => (base[n] = ""));
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
      try {
        localStorage.setItem(`fill_blanks::${storageKey}`, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  };

  const output = useMemo(
    () =>
      segments
        .map((seg) =>
          seg.type === "text"
            ? seg.text
            : values[seg.name] || `[${seg.label ?? seg.name}]`,
        )
        .join(""),
    [segments, values],
  );

  const { copy, status: copyStatus } = useCopy();
  const handleCopy = () => copy(output);

  const filled = names.filter((n) => (values[n] ?? "").trim()).length;

  return (
    <section className="widget-shell">
      {config.title ? (
        <div className="widget-header">
          <h3 className="widget-header__title">{config.title}</h3>
          <p className="widget-header__desc">
            Remplis les blancs puis passe en mode capture pour prendre une capture d&apos;écran.
          </p>
        </div>
      ) : null}

      {!capture ? (
        <blockquote className="rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] p-[var(--space-md)] text-[1.02rem] leading-[1.8] whitespace-pre-wrap text-[color:var(--text-primary)]">
          {segments.map((seg, idx) =>
            seg.type === "text" ? (
              <span key={`t:${idx}`}>{seg.text}</span>
            ) : (
              <InlineInput
                key={`f:${seg.name}:${idx}`}
                name={seg.name}
                value={values[seg.name] ?? ""}
                onChange={(v) => setVal(seg.name, v)}
                placeholder={seg.label ?? seg.name}
              />
            ),
          )}
        </blockquote>
      ) : (
        <blockquote className="rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] p-[var(--space-lg)] text-[1.1rem] leading-[1.8] whitespace-pre-wrap text-[color:var(--text-primary)]">
          {segments.map((seg, idx) => {
            if (seg.type === "text") return <span key={idx}>{seg.text}</span>;
            const v = values[seg.name];
            return (
              <em key={idx} className="not-italic font-medium">
                {v && v.trim() ? v : seg.label ?? seg.name}
              </em>
            );
          })}
        </blockquote>
      )}

      <div className="widget-actions">
        <span
          className="mr-auto font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
          role="status"
          aria-live="polite"
        >
          {copyFeedbackLabel(copyStatus) || `${filled}/${names.length} rempli${filled > 1 ? "s" : ""}`}
        </span>
        <button
          onClick={() => setCapture((v) => !v)}
          className="btn btn-ghost text-xs"
        >
          {capture ? "Quitter capture" : "Mode capture"}
        </button>
        <button onClick={handleCopy} className="btn btn-primary text-xs">
          Copier
        </button>
      </div>
    </section>
  );
}
