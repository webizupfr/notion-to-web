import type { ReactNode } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AppHeader } from "@/components/layout/AppHeader";


export default function SitesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <a href="#main-content" className="skip-to-content">
        Aller au contenu principal
      </a>
      <AppHeader />
      <main id="main-content" className="flex-1">
        {children}
        <SpeedInsights />
      </main>
    </div>
  );
}
