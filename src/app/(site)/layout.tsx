import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SpeedInsights } from "@vercel/speed-insights/next"


export default function SitesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      {/* pas de fond ici : on hérite du root */}
      <Header />
      <main className="flex-1 px-6 pb-20 sm:px-8">
        {children}
        <SpeedInsights />
      </main>
      <Footer />
    </div>
  );
}
