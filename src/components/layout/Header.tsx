"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import clsx from "clsx";
import { Container } from "@/components/layout/Container";

export type NavLink = { href: string; label: string; accent?: boolean };
type ContainerSize = "narrow" | "wide" | "fluid";

function computeLinks(pathname: string): { links: NavLink[]; univers: "studio" | "lab" | "campus" | "neutral" } {
  const isLab = pathname.startsWith("/lab");
  const isCampus = pathname.startsWith("/campus");
  const isStudio = pathname.startsWith("/studio");
  const univers: "studio" | "lab" | "campus" | "neutral" = isLab ? "lab" : isCampus ? "campus" : isStudio ? "studio" : "neutral";

  if (univers === "lab") {
    return {
      univers,
      links: [
        { href: "/lab", label: "Le Lab" },
        { href: "/lab/programme", label: "Programme" },
        { href: "/lab/ateliers", label: "Ateliers" },
        { href: "/lab/challenge", label: "Rejoindre le Challenge", accent: true },
      ],
    };
  }

  if (univers === "campus") {
    return {
      univers,
      links: [
        { href: "/campus", label: "A propos" },
        { href: "/campus/sprint", label: "Sprint" },
        { href: "/contact", label: "Contact", accent: true },
      ],
    };
  }

  return {
    univers: "studio",
    links: [
      { href: "/studio", label: "Le studio" },
      { href: "/studio/accompagnement", label: "Nos accompagnements" },
      { href: "/studio/adn", label: "ADN et méthodes" },
      { href: "/studio/cas-client", label: "Cas Clients" },
      { href: "https://impulsion.fillout.com/appel-45-minutes", label: "Planifier un échange", accent: true },
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

  const hubModeByPath = useMemo(() => pathname.startsWith("/hubs") || /\/c\/[\w-]+/.test(pathname), [pathname]);
  const [hubFlag, setHubFlag] = useState(false);
  useEffect(() => {
    try {
      const el = document.documentElement;
      const check = () => setHubFlag(el.getAttribute("data-hub") === "1");
      check();
      const mo = new MutationObserver(check);
      mo.observe(el, { attributes: true, attributeFilter: ["data-hub"] });
      return () => mo.disconnect();
    } catch {}
  }, []);
  const hubMode = hubModeByPath || hubFlag;

  // 👉 Ambre “signature” (tu peux mapper ça sur ton système de tokens)
  const AMBER = "var(--amber, #f59e0b)"; // fallback amber-500
  const AMBER_SOFT = "color-mix(in_oklab, var(--amber, #f59e0b) 14%, transparent)";

  const headerClass =
    "sticky top-0 z-40 border-b border-[color-mix(in_oklab,var(--border)_60%,transparent)] " +
    "bg-[color-mix(in_oklab,var(--bg)_88%,#fff)]/92 backdrop-blur-xl shadow-sm";

  // Nav “texte” premium (fini les pills)
  const navTextBase =
    "relative inline-flex items-center gap-2 px-2 py-1 text-[0.82rem] font-medium tracking-tight " +
    "text-[color-mix(in_oklab,var(--fg)_78%,#777)] transition-colors";

  const navTextHover =
    "hover:text-[color:var(--fg)]";

  const navTextActive =
    "text-[color:var(--fg)]";

  // Underline + point ambre (simple, premium)
  const activeMark =
    "after:absolute after:left-2 after:right-2 after:-bottom-1 after:h-[2px] after:rounded-full " +
    "after:bg-[color:var(--amber,#f59e0b)]";

  const dot =
    "inline-block size-1.5 rounded-full bg-[color:var(--amber,#f59e0b)]";

  // CTA unique (accent)
  const ctaClass =
    "inline-flex items-center rounded-full px-3 py-1.5 text-[0.82rem] font-semibold tracking-tight " +
    "border border-[color-mix(in_oklab,var(--border)_70%,transparent)] " +
    "bg-[color-mix(in_oklab,var(--bg)_86%,#fff)] " +
    "text-[color:var(--fg)] shadow-sm " +
    "hover:bg-[color-mix(in_oklab,var(--bg)_80%,#fff)] " +
    "focus:outline-none focus:ring-2 focus:ring-[color:var(--amber,#f59e0b)]/50";

  const ctaGlow =
    "shadow-[0_10px_30px_-18px_color-mix(in_oklab,var(--amber,#f59e0b)_55%,transparent)]";

  const headerVars: CSSProperties & { "--amber": string } = { "--amber": AMBER };

  return (
    <header className={headerClass} style={headerVars}>
      <Container size={size} className="flex h-12 items-center justify-between gap-3">
        {/* Logo */}
        <Link
          href="/"
          className="font-display font-semibold tracking-tight text-[color:var(--fg)]/92 hover:opacity-90 inline-flex items-center gap-2"
          aria-label="Impulsion – Accueil"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
          </svg>
          Impulsion
        </Link>

        {hubMode ? (
          <span />
        ) : (
          <>
            {/* Nav desktop */}
            <nav className="hidden md:flex items-center gap-4">
              {navLinks.map((link) => {
                const active = isActive(link.href);

                if (link.accent) {
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={clsx(ctaClass, ctaGlow)}
                      style={{ background: `linear-gradient(180deg, ${AMBER_SOFT}, transparent)` }}
                    >
                      {link.label}
                    </Link>
                  );
                }

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      navTextBase,
                      navTextHover,
                      active && navTextActive,
                      active && activeMark
                    )}
                  >
                    <span>{link.label}</span>
                    {active ? <span className={dot} aria-hidden="true" /> : null}
                  </Link>
                );
              })}
            </nav>

            {/* Toggle mobile */}
            <button
              aria-label="Menu"
              onClick={() => setOpen((v) => !v)}
              className="md:hidden inline-flex items-center rounded-full border border-[color-mix(in_oklab,var(--border)_70%,transparent)] px-3 py-1.5 text-[0.82rem] font-medium text-[color:var(--fg)]/85 bg-[color-mix(in_oklab,var(--bg)_86%,#fff)]"
            >
              {open ? "Fermer" : "Menu"}
            </button>
          </>
        )}
      </Container>

      {/* Drawer mobile */}
      {!hubMode && (
        <div
          className={clsx(
            "md:hidden overflow-hidden transition-[max-height,opacity] duration-200 ease-out",
            open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <Container size={size} className="py-2">
            <nav className="flex flex-col">
              {navLinks.map((link) => {
                const active = isActive(link.href);

                if (link.accent) {
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={clsx("mt-2", ctaClass, ctaGlow, "justify-center")}
                      style={{ background: `linear-gradient(180deg, ${AMBER_SOFT}, transparent)` }}
                    >
                      {link.label}
                    </Link>
                  );
                }

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "flex items-center justify-between py-2",
                      "border-l-2 pl-3",
                      active
                        ? "border-l-[color:var(--amber,#f59e0b)] text-[color:var(--fg)]"
                        : "border-l-transparent text-[color-mix(in_oklab,var(--fg)_78%,#777)] hover:text-[color:var(--fg)]"
                    )}
                  >
                    <span className="text-[0.95rem] font-medium">{link.label}</span>
                    {active ? <span className={dot} aria-hidden="true" /> : null}
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
