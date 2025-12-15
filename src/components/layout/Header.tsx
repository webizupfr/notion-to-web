"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";

export type NavLink = { href: string; label: string; accent?: boolean };
type ContainerSize = "narrow" | "wide" | "fluid";

function computeLinks(pathname: string): { links: NavLink[]; univers: "studio" | "lab" | "neutral" } {
  const isLab = pathname.startsWith("/lab");
  const isStudio = pathname.startsWith("/studio");
  const univers: "studio" | "lab" | "neutral" = isLab ? "lab" : isStudio ? "studio" : "neutral";

  if (univers === "lab") {
    return {
      univers,
      links: [
        { href: "/lab", label: "Challenge" },
        { href: "/lab/atelier", label: "Atelier" },
        { href: "/lab", label: "Rejoindre le Challenge", accent: true },
      ],
    };
  }

  // Studio par défaut (ou neutral)
  return {
    univers: "studio",
    links: [
      { href: "/studio", label: "Entreprise" },
      { href: "/studio/campus", label: "Campus" },
      { href: "/blog", label: "Blog" },
      { href: "https://impulsion.fillout.com/appel-45-minutes", label: "Planifier un échange", accent: true},
    ],
  };
}

export function Header({ links, size = "narrow" }: { links?: NavLink[]; size?: ContainerSize }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const computed = useMemo(() => computeLinks(pathname), [pathname]);
  const navLinks = links ?? computed.links;

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/gate")) return pathname.startsWith("/gate");
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Hub mode: neutral header (logo only)
  const hubModeByPath = useMemo(() => pathname.startsWith('/hubs') || /\/c\/[\w-]+/.test(pathname), [pathname]);
  const [hubFlag, setHubFlag] = useState(false);
  useEffect(() => {
    // Observe data-hub="1" on <html> to force hub mode even on dynamic hub slugs
    try {
      const el = document.documentElement;
      const check = () => setHubFlag(el.getAttribute('data-hub') === '1');
      check();
      const mo = new MutationObserver(check);
      mo.observe(el, { attributes: true, attributeFilter: ['data-hub'] });
      return () => mo.disconnect();
    } catch {
      // ignore when not in browser
    }
  }, []);
  const hubMode = hubModeByPath || hubFlag;

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_85%,#fff)] backdrop-blur-md">
      <Container size={size} className="flex h-12 items-center justify-between gap-3">
        {/* Logo texte avec zap */}
        <Link
          href="/"
          className="font-display text-[0.85rem] font-semibold tracking-tight text-[color:var(--fg)]/90 hover:opacity-90 inline-flex items-center gap-1.5"
          aria-label="Impulsion – Accueil"
        >
          <svg
            className="w-4 h-4 text-[color:var(--accent)]"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
          </svg>
          Impulsion
        </Link>

        {hubMode ? (
          // Header neutre (logo uniquement) sur les hubs et leurs pages
          <span />
        ) : (
          <>
            {/* Nav desktop */}
            <nav className="hidden items-center gap-1.5 md:flex text-[0.85rem]">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`pill text-[0.85rem] ${link.accent ? "pill-accent" : ""}`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Toggle mobile */}
            <button
              aria-label="Menu"
              onClick={() => setOpen((v) => !v)}
              className="md:hidden rounded-full border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_82%,#fff)] px-3 py-1 text-[0.9rem] text-[color:var(--fg)]/85 backdrop-blur-md"
            >
              {open ? "Fermer" : "Menu"}
            </button>
          </>
        )}
      </Container>

      {/* Drawer mobile (désactivé en hubMode) */}
      {!hubMode && (
        <div
          className={`md:hidden transition-[max-height,opacity] duration-200 ease-out ${
            open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          } overflow-hidden`}
        >
          <Container size={size} className="py-2">
            <nav className="flex flex-col gap-2 rounded-2xl border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_88%,#fff)] p-3 backdrop-blur-md">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-xl px-4 py-2.5 text-[0.95rem] ${
                      active
                        ? "bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] text-[color:var(--fg)]"
                        : "text-[color:var(--fg)]/90 hover:bg-[color-mix(in_oklab,var(--bg)_92%,#fff)]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </Container>
        </div>
      )}
    </header>
  );
}
