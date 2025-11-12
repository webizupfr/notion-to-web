"use client";

import { Children, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export function TodoBlock({
  storageKey,
  initialChecked,
  tone,
  colorAttr,
  children,
}: {
  storageKey: string;
  initialChecked: boolean;
  tone?: string;
  colorAttr?: string;
  children: ReactNode;
}) {
  const key = useMemo(() => `todo_state::${storageKey}`, [storageKey]);
  const [checked, setChecked] = useState<boolean>(initialChecked);
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

  const parts = Children.toArray(children);
  const labelNode = parts[0] ?? null;
  const nested = parts[1] ?? null;

  return (
    <label
      className="todo flex items-start gap-3 rounded-[20px] border px-5 py-4 text-[0.98rem] leading-[1.6] cursor-pointer select-none"
      data-todo-color={colorAttr}
      data-todo-tone={tone}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
      />
      <span
        className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-md border text-[0.75rem] font-semibold"
        data-checked={checked ? "true" : "false"}
        aria-hidden
      >
        {checked ? <span>✓</span> : null}
      </span>
      <div className="flex-1">
        <div className={checked ? "line-through opacity-55" : undefined}>{labelNode}</div>
        {nested ? <div className="mt-3 w-full space-y-3 text-[0.92rem]">{nested}</div> : null}
      </div>
    </label>
  );
}
