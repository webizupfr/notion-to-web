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
    <div className="overflow-hidden rounded-[22px] border border-slate-900/40 bg-slate-900 text-slate-50 shadow-subtle">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-900/60 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
        <span>{language ?? "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-medium text-slate-200 transition hover:border-white/30 hover:text-white"
        >
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
      <pre className="max-h-[480px] overflow-auto px-5 py-4 text-[0.92rem] leading-[1.6]">
        <code>{code}</code>
      </pre>
      {footer ? <div className="border-t border-white/10 px-4 py-3 text-[0.8rem] text-slate-300">{footer}</div> : null}
    </div>
  );
}
