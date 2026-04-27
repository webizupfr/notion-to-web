"use client";

import { useEffect, useMemo, useState } from "react";
import type { CheckboxWidgetConfig } from "@/lib/widget-parser";

export function CheckboxWidget({
  config,
  storageKey,
}: {
  config: CheckboxWidgetConfig;
  storageKey: string;
}) {
  const key = useMemo(() => `checkbox_state::${storageKey}`, [storageKey]);
  const [checked, setChecked] = useState<boolean>(Boolean(config.default));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved === "1" || saved === "true") setChecked(true);
      if (saved === "0" || saved === "false") setChecked(false);
    } catch { /* ignore */ }
    setMounted(true);
  }, [key]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(key, checked ? "1" : "0");
    } catch { /* ignore */ }
  }, [mounted, key, checked]);

  return (
    <label
      className={`flex items-start gap-3 rounded-[var(--r-m)] border px-[var(--space-md)] py-[var(--space-sm)] text-[0.98rem] leading-[1.6] cursor-pointer select-none transition-colors ${
        checked
          ? "border-[color:var(--signal-success)] bg-[color:var(--signal-success-bg)]"
          : "border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] hover:border-[color:var(--border-strong)]"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="mt-1 h-5 w-5 flex-shrink-0 rounded border-[color:var(--border-subtle)] text-[color:var(--signal-success)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--signal-success)_24%,transparent)]"
        aria-describedby={config.description ? `${storageKey}-desc` : undefined}
      />
      <div className="flex-1 min-w-0">
        <div className={checked ? "line-through opacity-60 text-[color:var(--text-primary)]" : "text-[color:var(--text-primary)]"}>
          {config.label}
        </div>
        {config.description ? (
          <div
            id={`${storageKey}-desc`}
            className="mt-1 text-[0.92rem] text-[color:var(--text-secondary)]"
          >
            {config.description}
          </div>
        ) : null}
      </div>
    </label>
  );
}
