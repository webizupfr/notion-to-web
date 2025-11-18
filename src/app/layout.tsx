import type { ReactNode } from "react";
import "./globals.css";
import { Outfit, Space_Grotesk } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-text",
  weight: ["300","400","500","600","700"],
  display: "swap",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400","500","600","700"],
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className="bg-[var(--background)]">
      <body className={`${outfit.variable} ${display.variable} relative isolate min-h-dvh text-base antialiased`}>
        {/* Fond clair + halos (centralisés ici uniquement) */}
        <div className="pointer-events-none absolute inset-0 -z-20">
          <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-slate-50" />
          <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_15%_-5%,rgba(251,191,36,0.18),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_450px_at_85%_0%,rgba(230,57,70,0.12),transparent_55%)]" />
        </div>

        {/* Wrapper page */}
        <div className="relative flex min-h-dvh flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}