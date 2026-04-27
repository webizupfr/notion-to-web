import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "@/styles/marketing.css";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import { getBaseUrl } from "@/lib/base-url";
import { brand } from "@/config/brand";
import { ThemeScript } from "@/components/ThemeScript";
import { ThemeToggle } from "@/components/ThemeToggle";

const fontSans = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-text",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const fontDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

/**
 * SEO / noindex — contrôlable via env var `SEO_NOINDEX`.
 * Par défaut : noindex (comportement historique, site privé).
 * Pour ouvrir au public : mettre `SEO_NOINDEX=0` en prod.
 * Un refactor complet SEO (generateMetadata par page, OG dynamique, JSON-LD)
 * est prévu en Sprint 4.
 */
const noindex = (process.env.SEO_NOINDEX ?? "1") !== "0";

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: brand.fullName,
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
  applicationName: brand.name,
  authors: [{ name: brand.name }],
  openGraph: {
    title: brand.fullName,
    description: brand.description,
    siteName: brand.name,
    locale: brand.locale,
    type: "website",
  },
  robots: noindex
    ? {
        index: false,
        follow: false,
        googleBot: { index: false, follow: false, noimageindex: true },
      }
    : undefined,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={brand.locale} className="bg-[var(--background)]" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable} relative isolate min-h-dvh text-base antialiased`}>
        {/* Wrapper page */}
        <div className="relative flex min-h-dvh flex-col">
          {children}
        </div>
        {/* Theme toggle flottant — accessible partout (bottom-right) */}
        <div className="fixed bottom-[var(--space-md)] right-[var(--space-md)] z-[var(--z-sticky)]">
          <ThemeToggle />
        </div>
      </body>
    </html>
  );
}
