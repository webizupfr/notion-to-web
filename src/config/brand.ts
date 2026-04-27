/**
 * Brand config — single source of truth pour l'identité du client.
 *
 * Pour white-label / déploiement d'une nouvelle instance :
 *   1. Modifier CE fichier
 *   2. Modifier src/config/navigation.ts
 *   3. Remplir .env.local (cf. .env.example)
 *   4. Remplacer public/favicon.ico + assets dans public/
 *   5. Tokens couleur dans src/lib/theme/tokens.css
 *
 * Pas de find-replace à faire dans 10 fichiers, pas de grep "Impulsion".
 */

export const brand = {
  /** Nom court (header, footer, copyright) */
  name: "Impulsion",
  /** Nom complet pour titles, metadata */
  fullName: "Impulsion · Studio d'innovation",
  /** Baseline / tagline courte (footer, home) */
  tagline: "Stratégie. Design. Action.",
  /** Description par défaut (metadata, OG) */
  description:
    "Studio d'innovation augmentée. Propulser les équipes, équiper les entrepreneurs.",

  /** Zone privée (gate, login-like pages) */
  privateArea: {
    title: "Espace privé",
    appName: "Impulsion App",
    subtitle: "Espace de travail privé.",
    helpHint: "Demande l'accès à ton interlocuteur Impulsion.",
  },

  /** CTA principal externe (Fillout / Calendly / etc.) */
  contactUrl: "https://impulsion.fillout.com/appel-45-minutes",
  contactLabel: "Planifier un échange",
  /** Email de support (utilisé pour CTA "Contact" dans certains contextes) */
  supportEmail: "hello@impulsion.studio",
  /** URL du site public externe (ex: "site mère" marketing séparé) — null si pas d'externe */
  marketingUrl: "https://impulsion.studio" as string | null,

  /** Réseaux sociaux (laisser `null` si non utilisé) */
  social: {
    linkedin: "https://www.linkedin.com/company/impulsionstudio" as string | null,
    twitter: null as string | null,
    youtube: null as string | null,
    instagram: null as string | null,
  },

  /** Pages légales internes (hébergées dans Notion ou code) */
  legal: {
    mentionsLegales: "/mentions-legales",
    confidentialite: "/confidentialite",
  },

  /** Locale principale (FR only pour l'instant, i18n non implémenté) */
  locale: "fr",

  /**
   * Label générique utilisé par certains widgets (ex: PromptTemplate "BRAND_OR_TEAM")
   * pour injecter la marque dans un prompt d'IA.
   */
  brandOrTeamLabel: "Impulsion",
} as const;

export type Brand = typeof brand;
