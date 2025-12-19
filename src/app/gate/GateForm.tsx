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
    <div className="space-y-3">
      <label
        htmlFor="access-token"
        className="block text-[0.78rem] font-medium tracking-[0.12em] uppercase text-[color:var(--ink)]/55"
      >
        Clé d’accès
      </label>

      <input
        id="access-token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Collez votre clé"
        autoComplete="one-time-code"
        inputMode="text"
        className={[
          "w-full rounded-2xl border border-black/[0.08] bg-white/55 px-4 py-3",
          "text-[1rem] text-[color:var(--ink)] placeholder:text-black/30",
          "outline-none transition",
          "focus:border-black/[0.18] focus:bg-white/70",
        ].join(" ")}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            pushWithToken();
          }
        }}
      />

      <button
        onClick={pushWithToken}
        className={[
          "w-full rounded-2xl px-4 py-3",
          "text-[0.98rem] font-medium tracking-[-0.01em]",
          "border border-black/[0.10] bg-black/[0.88] text-white",
          "shadow-[0_18px_40px_rgba(10,14,30,0.18)]",
          "transition-transform duration-200 hover:translate-y-[-1px] active:translate-y-0",
        ].join(" ")}
      >
        Déverrouiller
      </button>
    </div>
  );
}
