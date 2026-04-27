"use client";

import { useEffect, useMemo, useState } from "react";
import type { PatternBuilderWidgetConfig, PatternField } from "@/lib/widget-parser";
import { useCopy, copyFeedbackLabel } from "./useCopy";

type Row = Record<string, string> & { id: string };

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const TOAST_MS = 2200;

export function PatternBuilderWidget({
  config,
  storageKey,
}: {
  config: PatternBuilderWidgetConfig;
  storageKey: string;
}) {
  const fields: PatternField[] = useMemo(
    () =>
      config.fields ?? [
        { id: "symptome", label: "Symptôme", type: "textarea", placeholder: "Verbatim exact / comportement observé" },
        { id: "cause", label: "Cause possible", type: "textarea", placeholder: "Besoin / tension / opportunité derrière le symptôme" },
        { id: "opportunite", label: "Opportunité", type: "text", placeholder: "Piste à tester / question à creuser" },
      ],
    [config.fields],
  );

  const [rows, setRows] = useState<Row[]>([]);
  const [sampleMode, setSampleMode] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`pattern_builder::${storageKey}`);
      const saved = raw ? (JSON.parse(raw) as Row[]) : null;
      if (saved && saved.length) {
        setRows(saved);
        setSampleMode(false);
        return;
      }
    } catch { /* ignore */ }

    const s1: Row = { id: "sample-1" } as Row;
    const s2: Row = { id: "sample-2" } as Row;
    for (const f of fields) {
      if (f.id === "theme") { s1[f.id] = "Organisation"; s2[f.id] = "Motivation"; }
      else if (f.id === "observation") { s1[f.id] = "« Je commence toujours en retard. »"; s2[f.id] = "« Je procrastine tant que je ne vois pas l'intérêt. »"; }
      else if (f.id === "interpretation") { s1[f.id] = "Besoin de cadre simple et visuel"; s2[f.id] = "Manque de sens — besoin de voir l'utilité immédiate"; }
      else { s1[f.id] = ""; s2[f.id] = ""; }
    }
    setRows([s2, s1]);
    setSampleMode(true);
  }, [storageKey, fields]);

  useEffect(() => {
    if (sampleMode) return;
    try {
      localStorage.setItem(`pattern_builder::${storageKey}`, JSON.stringify(rows));
    } catch { /* ignore */ }
  }, [rows, storageKey, sampleMode]);

  const add = () => {
    const empty = fields.every((f) => !((draft[f.id] ?? "").trim()));
    if (empty) return;
    const row: Row = { id: uid() } as Row;
    for (const f of fields) row[f.id] = (draft[f.id] ?? "").trim();
    setRows((prev) => [row, ...prev.filter((r) => !r.id.startsWith("sample-"))]);
    if (sampleMode) setSampleMode(false);
    setDraft({});
    setLastAdded(row.id);
    setToast("Motif ajouté");
    window.setTimeout(() => setToast(null), TOAST_MS);
  };

  const remove = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const md = useMemo(() => {
    const head = `| ${fields.map((f) => f.label).join(" | ")} |\n|${fields.map(() => "---").join("|")}|`;
    const lines = rows.map((r) => `| ${fields.map((f) => (r[f.id] ?? "").replace(/\n/g, " ")).join(" | ")} |`);
    return [head, ...lines].join("\n");
  }, [rows, fields]);

  const { copy, status: copyStatus } = useCopy();
  const handleCopy = () => copy(md);

  const userRows = rows.filter((r) => !r.id.startsWith("sample-"));

  return (
    <section className="widget-shell">
      {config.title ? (
        <div className="widget-header">
          <h3 className="widget-header__title">{config.title}</h3>
          <p className="widget-header__desc">
            Pour chaque observation, identifie le besoin sous-jacent et l&apos;opportunité qu&apos;il ouvre.
          </p>
        </div>
      ) : null}

      <div className="rounded-[var(--r-m)] border border-dashed border-[color:var(--border-subtle)] bg-[color:var(--surface-2)] p-[var(--space-md)] text-[0.92rem] text-[color:var(--text-secondary)]">
        <strong className="text-[color:var(--text-primary)]">Comment remplir</strong> — note le{" "}
        <em>verbatim brut</em>, le <em>besoin révélé</em>, puis la{" "}
        <em>piste à tester</em>.
      </div>

      <div className="grid gap-[var(--space-sm)] md:grid-cols-3">
        {fields.map((f) => (
          <label key={`draft-${f.id}`} className="block space-y-1 min-w-0">
            <span className="widget-label">{f.label}</span>
            {f.type === "textarea" ? (
              <textarea
                value={draft[f.id] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [f.id]: e.target.value }))}
                placeholder={f.placeholder}
                rows={3}
              />
            ) : (
              <input
                value={draft[f.id] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [f.id]: e.target.value }))}
                placeholder={f.placeholder}
              />
            )}
          </label>
        ))}
      </div>

      <div className="widget-actions">
        <span
          className="mr-auto font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
          role="status"
          aria-live="polite"
        >
          {toast ?? (sampleMode ? "Exemples affichés · ajoutez vos motifs" : `${String(userRows.length).padStart(2, "0")} motif${userRows.length > 1 ? "s" : ""}`)}
        </span>
        <button onClick={add} className="btn btn-primary text-xs" disabled={fields.every((f) => !((draft[f.id] ?? "").trim()))}>
          + Ajouter
        </button>
      </div>

      {/* Table of patterns */}
      <div className="overflow-auto rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]">
        <table className="w-full min-w-[540px] text-sm">
          <thead className="bg-[color:var(--surface-2)]">
            <tr>
              {fields.map((f) => (
                <th
                  key={`h-${f.id}`}
                  className="px-[var(--space-sm)] py-[var(--space-xs)] text-left font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]"
                >
                  {f.label}
                </th>
              ))}
              <th className="px-[var(--space-sm)] py-[var(--space-xs)]" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={r.id}
                className={`border-t border-[color:var(--border-subtle)] ${idx % 2 === 1 ? "bg-[color:var(--surface-1)]" : ""} ${lastAdded === r.id ? "animate-slide-in" : ""} ${r.id.startsWith("sample-") ? "opacity-60" : ""}`}
              >
                {fields.map((f) => (
                  <td
                    key={`${r.id}-${f.id}`}
                    className="px-[var(--space-sm)] py-[var(--space-xs)] align-top whitespace-pre-wrap text-[color:var(--text-primary)]"
                  >
                    {r[f.id] ?? ""}
                  </td>
                ))}
                <td className="px-[var(--space-sm)] py-[var(--space-xs)] text-right">
                  {!r.id.startsWith("sample-") && (
                    <button
                      onClick={() => remove(r.id)}
                      className="btn btn-ghost text-xs"
                      aria-label="Supprimer ce motif"
                    >
                      Suppr.
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td
                  colSpan={fields.length + 1}
                  className="px-[var(--space-md)] py-[var(--space-lg)] text-[color:var(--text-tertiary)] text-center text-sm"
                >
                  Aucun motif pour l&apos;instant
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="widget-actions">
        <span
          className="mr-auto font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.06em] text-[color:var(--text-tertiary)]"
          role="status"
          aria-live="polite"
        >
          {copyFeedbackLabel(copyStatus)}
        </span>
        <button onClick={handleCopy} className="btn btn-ghost text-xs" disabled={!userRows.length}>
          Copier en Markdown
        </button>
      </div>
    </section>
  );
}
