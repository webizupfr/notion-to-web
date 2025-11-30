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
          <div className="absolute inset-0 bg-gradient-to-b from-white via-[rgba(244,243,237,0.95)] to-[rgba(241,238,232,0.9)]" />
          <div className="absolute inset-0 bg-[radial-gradient(1100px_520px_at_12%_-6%,rgba(199,240,0,0.12),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(960px_420px_at_88%_-4%,rgba(216,138,77,0.12),transparent_55%)]" />
        </div>

        {/* Wrapper page */}
        <div className="relative flex min-h-dvh flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
