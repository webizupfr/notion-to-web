"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";

export type NavLink = { href: string; label: string; accent?: boolean };

const defaultLinks: NavLink[] = [
  { href: "/sprint", label: "Sprint Innovation" },
  { href: "/challenge", label: "Challenge IA" },
  { href: "/blog", label: "Blog" },
  { href: "/gate?next=/", label: "Accès privé", accent: true },
];

export function Header({ links = defaultLinks }: { links?: NavLink[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/gate")) return pathname.startsWith("/gate");
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/35 backdrop-blur-md">
      <Container className="flex h-14 items-center justify-between gap-3">
        {/* Logo texte avec zap */}
        <Link
          href="/"
          className="font-display text-base font-semibold tracking-tight text-slate-800/90 hover:opacity-90 inline-flex items-center gap-1.5"
          aria-label="Impulsion – Accueil"
        >
          <svg
            className="w-5 h-5 text-amber-400"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
          </svg>
          Impulsion
        </Link>

        {/* Nav desktop */}
        <nav className="hidden items-center gap-2 md:flex">
          {links.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`pill ${link.accent ? "pill-accent" : ""}`}
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
          className="md:hidden rounded-full border border-white/40 bg-white/40 px-3 py-1.5 text-slate-700/90 backdrop-blur-md"
        >
          {open ? "Fermer" : "Menu"}
        </button>
      </Container>

      {/* Drawer mobile */}
      <div
        className={`md:hidden transition-[max-height,opacity] duration-200 ease-out ${
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        } overflow-hidden`}
      >
        <Container className="py-2">
          <nav className="flex flex-col gap-2 rounded-2xl border border-white/45 bg-white/45 p-3 backdrop-blur-md">
            {links.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-xl px-4 py-3 text-sm ${
                    active
                      ? "bg-white/60 text-slate-900"
                      : "text-slate-800/90 hover:bg-white/55"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </Container>
      </div>
    </header>
  );
}
