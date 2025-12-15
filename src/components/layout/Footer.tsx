import Link from "next/link";
import { Container } from "@/components/layout/Container";

type ContainerSize = "narrow" | "wide" | "fluid";

export function Footer({ size = "narrow" }: { size?: ContainerSize }) {
  return (
    <footer className="border-t border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_90%,#fff)] backdrop-blur-md">
      <Container size={size} className="flex flex-col sm:flex-row justify-between gap-6 py-6 text-[0.9rem] text-[color:var(--fg)]/80">
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
            <span>Impulsion - Studio d’innovation</span>
          </div>
          <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Stratégie. Design. Action.
          </p>
        </div>

        {/* Bloc droit : retrouver nous */}
        <div className="flex flex-col gap-1.5 text-[0.8rem] sm:text-[0.85rem] text-[color:var(--muted)]">
          <span className="font-semibold text-[color:var(--fg)]">Retrouvez-nous</span>
          <div className="flex gap-4">
            <Link href="/contact" className="hover:text-[color:var(--fg)] transition">
              Contact
            </Link>
            <a
              href="https://www.linkedin.com/company/impulsionstudio"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[color:var(--fg)] transition"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </Container>

      {/* Navigation légale */}
      <Container size={size} className="border-t border-[color:var(--border)] py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[0.75rem] text-[color:var(--muted)]/80">
        <nav className="flex flex-wrap gap-4">
          <Link href="/mentions-legales" className="hover:text-[color:var(--fg)] transition">
            Mentions légales
          </Link>
          <Link href="/confidentialite" className="hover:text-[color:var(--fg)] transition">
            Charte de confidentialité
          </Link>
        </nav>
        <div className="text-center sm:text-right text-[color:var(--muted)]/80">
          © {new Date().getFullYear()} Impulsion. Tous droits réservés.
        </div>
      </Container>
    </footer>
  );
}
