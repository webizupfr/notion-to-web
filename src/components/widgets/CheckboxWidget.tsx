"use client";

import { useEffect, useMemo, useState } from "react";
import type { CheckboxWidgetConfig } from "@/lib/widget-parser";

export function CheckboxWidget({ config, storageKey }: { config: CheckboxWidgetConfig; storageKey: string }) {
  const key = useMemo(() => `checkbox_state::${storageKey}`, [storageKey]);
  const [checked, setChecked] = useState<boolean>(Boolean(config.default));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved === "1" || saved === "true") setChecked(true);
      if (saved === "0" || saved === "false") setChecked(false);
    } catch {/* ignore */}
    setMounted(true);
  }, [key]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(key, checked ? "1" : "0");
    } catch {/* ignore */}
  }, [mounted, key, checked]);

  return (
    <label className="todo flex items-start gap-3 rounded-[20px] border px-5 py-4 text-[0.98rem] leading-[1.6] cursor-pointer select-none">
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
      <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-md border text-[0.75rem] font-semibold" data-checked={checked ? 'true' : 'false'}>
        {checked ? <span>✓</span> : null}
      </span>
      <div className="flex-1">
        <div className={checked ? "line-through opacity-55" : undefined}>{config.label}</div>
        {config.description ? <div className="mt-2 text-[0.92rem] text-slate-600">{config.description}</div> : null}
      </div>
    </label>
  );
}

