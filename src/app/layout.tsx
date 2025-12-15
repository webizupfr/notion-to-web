import type { ReactNode } from "react";
import "./globals.css";
import "@/styles/marketing.css";
import { Outfit } from "next/font/google";

const outfitText = Outfit({
  subsets: ["latin"],
  variable: "--font-text",
  weight: ["300","400","500","600","700"],
  display: "swap",
});

const outfitDisplay = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400","500","600","700"],
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className="bg-[var(--background)]">
      <body className={`${outfitText.variable} ${outfitDisplay.variable} relative isolate min-h-dvh text-base antialiased`}>
        {/* Wrapper page */}
        <div className="relative flex min-h-dvh flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
