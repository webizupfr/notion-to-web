"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GateForm({ next }: { next: string }) {
  const [token, setToken] = useState("");
  const router = useRouter();

  const pushWithToken = () => {
    const sep = next.includes("?") ? "&" : "?";
    try {
      document.cookie = `gate_key=${encodeURIComponent(token)}; Path=/; Max-Age=${60 * 60 * 24 * 30}`;
    } catch {}
    router.push(`${next}${sep}key=${encodeURIComponent(token)}`);
  };

  return (
    <div className="space-y-[var(--space-sm)]">
      <label
        htmlFor="access-token"
        className="block font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-tertiary)]"
      >
        Clé d&apos;accès
      </label>

      <input
        id="access-token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Collez votre clé"
        autoComplete="one-time-code"
        inputMode="text"
        className="w-full rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-0)] px-4 py-3 text-[1rem] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] outline-none transition-colors focus:border-[color:var(--accent-edge)]"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            pushWithToken();
          }
        }}
      />

      <button
        onClick={pushWithToken}
        className="btn btn-primary w-full"
        type="button"
      >
        Déverrouiller →
      </button>
    </div>
  );
}
