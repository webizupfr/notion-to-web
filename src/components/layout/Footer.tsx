import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { brand } from "@/config/brand";
import { footerLinks } from "@/config/navigation";

type ContainerSize = "narrow" | "wide" | "fluid";

export function Footer({ size = "narrow" }: { size?: ContainerSize }) {
  const socialLinks = Object.entries(brand.social).filter(
    ([, url]) => typeof url === "string" && url.length > 0,
  ) as [string, string][];

  return (
    <footer className="border-t border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_90%,#fff)] backdrop-blur-md">
      <Container
        size={size}
        className="flex flex-col sm:flex-row justify-between gap-6 py-6 text-[0.9rem] text-[color:var(--fg)]/80"
      >
        {/* Bloc gauche : logo + baseline */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 font-medium text-[color:var(--fg)]/90 text-[0.95rem]">
            <svg
              className="w-4 h-4 text-[color:var(--accent)]"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
            </svg>
            <span>{brand.fullName}</span>
          </div>
          <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[color:var(--muted)]">
            {brand.tagline}
          </p>
        </div>

        {/* Bloc droit : retrouver nous */}
        {(footerLinks.primary.length > 0 || socialLinks.length > 0) && (
          <div className="flex flex-col gap-1.5 text-[0.8rem] sm:text-[0.85rem] text-[color:var(--muted)]">
            <span className="font-semibold text-[color:var(--fg)]">Retrouvez-nous</span>
            <div className="flex gap-4">
              {footerLinks.primary.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hover:text-[color:var(--fg)] transition"
                >
                  {link.label}
                </Link>
              ))}
              {socialLinks.map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[color:var(--fg)] transition capitalize"
                >
                  {platform}
                </a>
              ))}
            </div>
          </div>
        )}
      </Container>

      {/* Navigation légale */}
      <Container
        size={size}
        className="border-t border-[color:var(--border)] py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[0.75rem] text-[color:var(--muted)]/80"
      >
        <nav className="flex flex-wrap gap-4">
          {footerLinks.legal.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-[color:var(--fg)] transition"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="text-center sm:text-right text-[color:var(--muted)]/80">
          © {new Date().getFullYear()} {brand.name}. Tous droits réservés.
        </div>
      </Container>
    </footer>
  );
}
