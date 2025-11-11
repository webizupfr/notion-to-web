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
      <label htmlFor="access-token" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
        Clé d’accès
      </label>
      <input
        id="access-token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Collez votre clé"
        autoComplete="one-time-code"
        inputMode="text"
        className="w-full rounded-2xl border border-white/60 bg-white/55 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            try {
              document.cookie = `gate_key=${encodeURIComponent(token)}; Path=/; Max-Age=${60 * 60 * 24 * 30}`;
            } catch {}
            pushWithToken();
          }
        }}
      />
      <button onClick={pushWithToken} className="btn btn-primary w-full">
        Déverrouiller
      </button>
    </div>
  );
}
