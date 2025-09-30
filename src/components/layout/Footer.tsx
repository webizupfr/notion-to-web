import Link from "next/link";
import { Container } from "@/components/layout/Container";

export function Footer() {
  return (
    <footer className="border-t border-black/5 bg-white/35 backdrop-blur-md">
      <Container className="flex flex-col sm:flex-row justify-between gap-8 py-8 text-sm text-slate-700/80">
        {/* Bloc gauche : logo + baseline */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-medium text-slate-800/90">
            <svg
              className="w-4 h-4 text-amber-400"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
            </svg>
            <span>Impulsion — Studio d’innovation</span>
          </div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Stratégie. Design. Action.
          </p>
        </div>

        {/* Bloc droit : retrouver nous */}
        <div className="flex flex-col gap-2 text-xs sm:text-sm text-slate-600">
          <span className="font-semibold text-slate-800">Retrouvez-nous</span>
          <div className="flex gap-4">
            <Link href="/contact" className="hover:text-slate-900 transition">
              Contact
            </Link>
            <a
              href="https://www.linkedin.com/company/impulsion-studio"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 transition"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </Container>

      {/* Navigation légale */}
      <Container className="border-t border-black/5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500/80">
        <nav className="flex flex-wrap gap-4">
          <Link href="/mentions-legales" className="hover:text-slate-900 transition">
            Mentions légales
          </Link>
          <Link href="/confidentialite" className="hover:text-slate-900 transition">
            Charte de confidentialité
          </Link>
        </nav>
        <div className="text-center sm:text-right">
          © {new Date().getFullYear()} Impulsion. Tous droits réservés.
        </div>
      </Container>
    </footer>
  );
}
