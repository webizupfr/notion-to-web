/* eslint-disable @next/next/no-img-element */
import Link from "next/link";

function hostFromUrl(url: string): { host: string; favicon?: string } {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const favicon = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
    return { host, favicon };
  } catch {
    return { host: url };
  }
}

export function LinkCard({ href, title, meta }: { href: string; title: string; meta?: string }) {
  const { host, favicon } = hostFromUrl(href);

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-[var(--r-md)] border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_96%,#fff)] px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[color:var(--fg)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      target="_blank"
      rel="noreferrer"
    >
      {favicon ? <img src={favicon} alt="" className="h-6 w-6 flex-shrink-0 rounded-[var(--r-sm)]" /> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.98rem] font-semibold text-[color:var(--fg)] group-hover:text-[color:var(--fg)]/90">{title}</div>
        <div className="truncate text-[12px] uppercase tracking-[0.12em] text-[color:var(--fg)]/55">{meta || host}</div>
      </div>
      <span aria-hidden className="text-lg text-[color:var(--fg)]/40 group-hover:text-[color:var(--primary)]">
        ↗
      </span>
    </Link>
  );
}
