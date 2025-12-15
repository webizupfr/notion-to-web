"use client";

import { useState } from "react";
import type { ReactNode } from "react";

type CodePanelProps = {
  code: string;
  language?: string | null;
  footer?: ReactNode;
};

export function CodePanel({ code, language, footer }: CodePanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.warn("copy failed", error);
    }
  };

  return (
    <div className="overflow-hidden rounded-[var(--r-xl)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--fg)_95%,#000)] text-[color:var(--bg)] shadow-[var(--shadow-subtle)]">
      <div className="flex items-center justify-between gap-3 border-b border-[color-mix(in_oklab,var(--bg)_12%,transparent)] bg-[color-mix(in_oklab,var(--fg)_88%,#000)] px-[var(--space-4)] py-[var(--space-2)] text-xs uppercase tracking-[0.2em] text-[color-mix(in_oklab,var(--bg)_85%,#fff)]">
        <span>{language ?? "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full border border-[color-mix(in_oklab,var(--bg)_18%,transparent)] px-[var(--space-3)] py-[var(--space-1)] text-[11px] font-medium text-[color-mix(in_oklab,var(--bg)_90%,#fff)] transition hover:border-[color-mix(in_oklab,var(--bg)_30%,transparent)] hover:text-[color:var(--bg)]"
        >
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <pre className="max-h-[480px] overflow-auto px-[var(--space-5)] py-[var(--space-4)] text-[0.92rem] leading-[1.6]">
        <code>{code}</code>
      </pre>
      {footer ? (
        <div className="border-t border-[color-mix(in_oklab,var(--bg)_12%,transparent)] px-[var(--space-4)] py-[var(--space-3)] text-[0.8rem] text-[color-mix(in_oklab,var(--bg)_82%,#fff)]">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
