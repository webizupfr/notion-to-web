/**
 * Navigation config — structure Header + home cards + footer links.
 *
 * Le site est organisé en "univers" (ex: Studio, Lab, Campus). Chaque univers
 * a sa propre nav qui s'affiche quand l'URL commence par `rootPath`.
 *
 * Pour white-label : éditer les universes ci-dessous + homeCards.
 */

import { brand } from "./brand";

export type NavLink = { href: string; label: string; accent?: boolean };

export type Universe = {
  /** Clé interne pour identifier l'univers */
  key: string;
  /** Préfixe d'URL (ex: "/studio") */
  rootPath: string;
  /** Label human (ex: "Le Studio") */
  label: string;
  /** Liens du header pour cet univers (le dernier peut être un accent CTA) */
  links: NavLink[];
};

/**
 * Univers disponibles. L'ordre compte : le premier matchant devient l'univers actif.
 * L'univers `default` sert de fallback quand aucun préfixe ne matche.
 */
export const universes: Universe[] = [
  {
    key: "lab",
    rootPath: "/lab",
    label: "Le Lab",
    links: [
      { href: "/lab", label: "Le Lab" },
      { href: "/lab/programme", label: "Programme" },
      { href: "/lab/ateliers", label: "Ateliers" },
      { href: "/lab/challenge", label: "Rejoindre le Challenge", accent: true },
    ],
  },
  {
    key: "campus",
    rootPath: "/campus",
    label: "Le Campus",
    links: [
      { href: "/campus", label: "A propos" },
      { href: "/campus/sprint", label: "Sprint" },
      { href: "/contact", label: "Contact", accent: true },
    ],
  },
  {
    key: "studio",
    rootPath: "/studio",
    label: "Le Studio",
    links: [
      { href: "/studio", label: "Le studio" },
      { href: "/studio/accompagnement", label: "Nos accompagnements" },
      { href: "/studio/adn", label: "ADN et méthodes" },
      { href: "/studio/cas-client", label: "Cas Clients" },
      { href: brand.contactUrl, label: brand.contactLabel, accent: true },
    ],
  },
];

/** Univers par défaut quand aucun préfixe d'URL ne matche (home, /blog, etc.) */
export const defaultUniverseKey = "studio";

/**
 * Retourne l'univers actif pour un pathname donné.
 * Utilisé par `<Header />`.
 */
export function universeFromPathname(pathname: string): Universe {
  for (const u of universes) {
    if (pathname.startsWith(u.rootPath)) return u;
  }
  return universes.find((u) => u.key === defaultUniverseKey) ?? universes[0];
}

/** Cartes affichées sur la home `/(site)/` */
export type HomeCard = {
  href: string;
  pill: string;
  title: string;
  description: string;
};

export const homeCards: HomeCard[] = [
  {
    href: "/studio",
    pill: "Le Studio",
    title: "Collectif, innovation, transformation",
    description: "Propulser les équipes et les projets stratégiques.",
  },
  {
    href: "/campus",
    pill: "Le Campus",
    title: "Immersion, mise en pratique, coaching",
    description: "Former vos talents dans un format intensif et premium.",
  },
  {
    href: "/lab",
    pill: "Le Lab",
    title: "IA, autonomie, apprentissage",
    description: "Accompagner les entrepreneurs et intrapreneurs.",
  },
];

/** Liens footer (pages légales + contact) */
export const footerLinks = {
  primary: [
    { href: "/contact", label: "Contact" },
  ] as NavLink[],
  legal: [
    { href: brand.legal.mentionsLegales, label: "Mentions légales" },
    { href: brand.legal.confidentialite, label: "Charte de confidentialité" },
  ] as NavLink[],
};
