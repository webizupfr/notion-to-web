"use client";

import { useCallback, useRef, useState } from "react";

type Status = "idle" | "copied" | "error";

export function useCopy(resetMs = 2000) {
  const [status, setStatus] = useState<Status>("idle");
  const timerRef = useRef<number | null>(null);

  const copy = useCallback(
    async (text: string) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      try {
        if (!text) {
          setStatus("error");
        } else if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          setStatus("copied");
        } else {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          const ok = document.execCommand("copy");
          document.body.removeChild(ta);
          setStatus(ok ? "copied" : "error");
        }
      } catch {
        setStatus("error");
      }
      timerRef.current = window.setTimeout(() => setStatus("idle"), resetMs);
    },
    [resetMs],
  );

  return { copy, status } as const;
}

export function copyFeedbackLabel(status: Status): string {
  if (status === "copied") return "Copié ✓";
  if (status === "error") return "Erreur";
  return "";
}
