import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SpeedInsights } from "@vercel/speed-insights/next"


export default function SitesLayout({ children }: { children: ReactNode }) {
  const size: "narrow" | "wide" = "wide"; // default to wide for visual consistency on full-width pages
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      {/* pas de fond ici : on hérite du root */}
      {/* Skip link pour l'accessibilité */}
      <a href="#main-content" className="skip-to-content">
        Aller au contenu principal
      </a>
      <Header size={size} />
      <main id="main-content" className="flex-1 px-6 pb-20 sm:px-8">
        {children}
        <SpeedInsights />
      </main>
      <Footer size={size} />
    </div>
  );
}
