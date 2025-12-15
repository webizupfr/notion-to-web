# Plan de migration Design System Premium

Objectif : transformer la base actuelle (patchwork, tokens dispersés, styles magiques) en un design system unifié, premium, maintenable, aligné “studio d’innovation”.

## Angles morts à adresser (obligatoire)
- Séparer les usages :  
  - MarketingShell (hero/sections travaillées, gradients possibles, surfaces alt)  
  - ContentShell (sobre, lisible, longues pages Notion : hubs, sprints, modules)  
  - Blog (entre les deux : éditorial + lisibilité)
- Documentation / DX : après chaque chapitre, mettre à jour une page `docs/DS-CHANGELOG.md` (tokens ajoutés, composants officiels, exemples d’usage, ce qui est legacy).
- Thème : rester single-theme (clair premium) pour l’instant, architecture prête pour thème 2 mais ne pas implémenter de dark mode tant qu’il n’est pas requis produit.

## Chapitre 1 — Refonte du Design System (DS Core)
- Étapes obligatoires  
  1) Créer un fichier unique de tokens (`src/lib/theme/tokens.css`) pour couleurs / spacing / radius / shadows / typo scale.  
  2) Exposer ces tokens dans `@theme inline` (Tailwind) pour les classes utilitaires.  
  3) Supprimer toutes les valeurs magiques (px, `text-slate-*`, `bg-white/*`, `rounded-[22px]`, etc.).  
  4) Uniformiser la palette (background, foreground, primary, accent, muted, états success/warning/danger, border, ring).  
  5) Définir l’échelle typographique de base dans les tokens.  
  6) Mettre à jour composants globaux (`btn`, surfaces, InfoCard, surfaces Notion) pour consommer les tokens.

- Snippet tokens unifiés (à appliquer dans `src/lib/theme/tokens.css`) :
```css
:root {
  /* palette */
  --bg: #f6f3ec;
  --bg-elevated: color-mix(in oklab, var(--bg) 92%, #fff);
  --fg: #0f1728;
  --muted: #6e7690;
  --primary: #c7f000;
  --accent: #d88a4d;
  --success: #2ca56b;
  --warning: #f59e0b;
  --danger: #d45050;
  --border: rgba(15,23,40,0.14);
  --ring: color-mix(in oklab, var(--primary) 35%, #0f1728);

  /* spacing */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 24px; --space-6: 32px; --space-7: 40px; --space-8: 48px; --space-9: 64px;

  /* radius */
  --r-sm: 10px; --r-md: 14px; --r-lg: 18px; --r-xl: 22px;

  /* shadows */
  --shadow-soft: 0 12px 32px -18px rgba(15,23,42,0.16);
  --shadow-elev: 0 26px 68px -32px rgba(8,12,18,0.24);
  --shadow-subtle: 0 8px 22px -16px rgba(15,23,42,0.14);

  /* typo scale */
  --font-base: 1rem;
  --step--1: 0.92rem;
  --step-0: 1rem;
  --step-1: 1.12rem;
  --step-2: 1.28rem;
  --step-3: 1.48rem;
  --step-4: 1.85rem;
  --step-5: 2.35rem;
}
```

- Mapping `@theme inline` (dans `src/app/globals.css`) :
```css
@theme inline {
  --color-background: var(--bg);
  --color-foreground: var(--fg);
  --color-muted: var(--muted);
  --color-primary: var(--primary);
  --color-accent: var(--accent);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-danger: var(--danger);
  --color-border: var(--border);
  --color-ring: var(--ring);
  --radius-md: var(--r-md);
  --radius-lg: var(--r-xl);
  --shadow-lg: var(--shadow-elev);
  --shadow-md: var(--shadow-soft);
  --spacing-4: var(--space-4);
  --spacing-6: var(--space-6);
  --font-sans: var(--font-text);
  --font-display: var(--font-display);
}
```

- Check-list migration DS  
  - Supprimer doublons `.btn` et prose dans `globals.css`.  
  - Remplacer toutes les couleurs slate/amber hardcodées par tokens.  
  - Remplacer valeurs magiques de rayon/espacement par tokens (`var(--r-*)`, `var(--space-*)`).  
  - Aligner `InfoCard` variants sur la palette tokens (success/warning/danger/accent).

## Chapitre 2 — Refonte Typographique Premium
- Étapes  
  1) Supprimer toutes les fonts concurrentes (ex : `Plus_Jakarta_Sans` dans `src/app/page.tsx`).  
  2) Garder une base (Outfit) + display (Space Grotesk).  
  3) Créer composants `Heading`, `Text`, `Eyebrow` (centraliser tailles/line-height/weight/letter-spacing).  
  4) Brancher mapping Notion headings → composants.

- Snippet `Heading` (`src/components/ui/Heading.tsx`) :
```tsx
import type { ReactNode } from "react";

const sizes = {
  1: "text-[clamp(2.35rem,3vw,2.8rem)] leading-[1.08] font-semibold",
  2: "text-[clamp(1.85rem,2.5vw,2.2rem)] leading-[1.16] font-semibold",
  3: "text-[clamp(1.4rem,2vw,1.65rem)] leading-[1.22] font-semibold",
};

export function Heading({ level = 2, children, eyebrow, description }: { level?: 1|2|3; children: ReactNode; eyebrow?: ReactNode; description?: ReactNode }) {
  const Tag = (`h${level}` as const);
  return (
    <header className="space-y-2">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <Tag className={`font-display tracking-[-0.015em] text-[var(--fg)] ${sizes[level]}`}>{children}</Tag>
      {description && <p className="text-[var(--muted)] text-[1rem] leading-[1.6]">{description}</p>}
    </header>
  );
}
```

- Règles hiérarchiques  
  - H1 : titre de page (Notion `heading_1`).  
  - H2 : section principale (Notion `heading_2`).  
  - H3 : sous-section (Notion `heading_3`).  
  - Eyebrow pour contexte, pas d’uppercase globale.

## Chapitre 3 — Refonte Layout & Rhythm
- Étapes  
  1) Créer `<PageSection>` générique avec `variant="marketing" | "content" | "blog"` (Container + padding + option alt).  
  2) Largeur texte : 60–72ch, max page 1200–1320px.  
  3) Espacements verticaux standards : 32/48/64px.  
  4) Harmoniser les héros (contraste, fond clair/sombre cohérent).  
  5) Migrer pages :  
     - Marketing : `src/app/page.tsx`, `src/app/(site)/page.tsx`, pages slug marketing.  
     - ContentShell : hubs/sprints/modules (pages Notion render).  
     - Blog : gabarit éditorial.

- Snippet `<PageSection>` (`src/components/layout/PageSection.tsx`) :
```tsx
import type { ReactNode } from "react";
import { Container } from "./Container";

export function PageSection({
  children,
  variant = "content", // "marketing" | "content" | "blog"
}: {
  children: ReactNode;
  variant?: "marketing" | "content" | "blog";
}) {
  const isMarketing = variant === "marketing";
  const isBlog = variant === "blog";
  const shell = isMarketing
    ? "bg-white/82 border border-[var(--border)] rounded-[var(--r-xl)] shadow-[var(--shadow-subtle)]"
    : isBlog
    ? "bg-white/90 border border-[var(--border)] rounded-[var(--r-lg)] shadow-[var(--shadow-subtle)]"
    : "";
  return (
    <section className="py-[var(--space-7)] sm:py-[var(--space-8)]">
      <Container className={`space-y-6 ${shell} px-[var(--space-6)] sm:px-[var(--space-7)]`}>
        {children}
      </Container>
    </section>
  );
}
```

- Règles d’usage  
  - Marketing : `variant="marketing"` pour hero/sections alt, gradients autorisés.  
  - ContentShell (hubs/sprints/modules Notion) : `variant="content"` (sobre, lisible).  
  - Blog : `variant="blog"` (éditorial, légèrement texturé).  
  - Paragraphe long : `max-w-[72ch]`.

## Chapitre 4 — Refonte des Composants Notion → Front
- Étapes  
  1) Librairie dédiée `src/components/notion/ui/` : `NotionHeading`, `NotionParagraph`, `NotionCallout`, `NotionTable`, `NotionColumns`, `RichText` (unique).  
  2) Ajouter blocs manquants : `equation` (KaTeX), `audio`/`file` (lecteur + meta), `table_of_contents` (sommaire local), `bookmark` unique.  
  3) Corriger bugs : supprimer double `case "bookmark"` dans `Blocks.tsx`, aligner callout/toggle sur `InfoCard`/`Accordion`.  
  4) Tables : `overflow-x-auto`, `min-w-max`, `text-sm`, sticky header optionnel.  
  5) Documenter le mapping Notion type → composant.

- Snippet table scrollable :
```tsx
export function NotionTable({ headerRow, bodyRows, hasRowHeader }: Props) {
  return (
    <div className="overflow-x-auto rounded-[var(--r-xl)] border border-[var(--border)]">
      <table className="min-w-max text-[0.95rem]">
        {/* thead/tbody */}
      </table>
    </div>
  );
}
```

## Chapitre 5 — Responsive / Mobile-first Premium
- Étapes  
  1) Audit des tailles fixes et remplacements par tokens + breakpoints.  
  2) Paddings mobiles réduits (`px-[var(--space-4)]` / `py-[var(--space-6)]`).  
  3) Tables scrollables horizontalement partout.  
  4) Sidebar (`PageSidebar`) en mode sheet mobile (position fixe bottom, hauteur auto, scroll interne).  
  5) Layout “day” : extraire en composant `DaySectionCard` (hero/section) avec styles responsive.  
  6) Vérifier les trois contextes (marketing, blog, content shell) sur 375/768/1024.

- Snippet padding mobile :
```jsx
<div className="px-[var(--space-4)] sm:px-[var(--space-6)] py-[var(--space-6)] sm:py-[var(--space-8)]">
```

## Chapitre 6 — Accessibilité & Propreté Structurelle
- Étapes  
  1) Scinder `globals.css` en `tokens.css` (déjà), `base.css` (reset, body, focus), `utilities.css` (btn, surfaces, prose hooks).  
  2) Supprimer styles morts (anciens `.btn`, prose dupliquée, callout/toggle inline non utilisés).  
  3) Sections Notion en `<section aria-labelledby=...>` avec IDs sur headings.  
  4) Boutons : `<button>` ou `role="button"` pour `<a>`, `aria-pressed` pour toggles.  
  5) Contrastes : vérifier surfaces (InfoCard hero, hero texte blanc sur fond clair).  
  6) Documentation : mettre à jour `docs/DS-CHANGELOG.md` avec règles, tokens, composants officiels, ce qui est legacy.

- Snippet section sémantique :
```tsx
<section aria-labelledby={`h-${block.id}`}>
  <Heading id={`h-${block.id}`} level={2}>{title}</Heading>
  {children}
</section>
```

## Ordre de priorité (à respecter)
1) DS Core (tokens unifiés + `@theme inline`, purge valeurs magiques).  
2) Typographie (fonts uniques, composants Heading/Text).  
3) Layout global (PageSection, containers, héros).  
4) Composants Notion (factorisation, blocs manquants, bug bookmark).  
5) Responsive (paddings, tables, sidebar sheet).  
6) Accessibilité/ménage final (split CSS, sémantique, boutons).

## Prérequis par chapitre
- Chap 1 avant tout (base tokens).  
- Chap 2 dépend de 1 (Heading consomme tokens).  
- Chap 3 dépend de 2 (Layout utilise Heading/Text).  
- Chap 4 dépend de 1–3 (Notion consomme DS + typographie + layout).  
- Chap 5 dépend de 4 (responsive sur nouveaux composants).  
- Chap 6 en dernier (cleanup/a11y).

## Protocole QA après chaque chapitre
- Chap 1 : Tailwind génère bien les classes, contrastes AA des boutons/surfaces.  
- Chap 2 : revue visuelle titres mobile/desktop, aucune font tierce.  
- Chap 3 : rythme vertical cohérent, pas de débordement, containers homogènes.  
- Chap 4 : page de test avec tous les blocs Notion (callout/toggle/table/media), aucune erreur console.  
- Chap 5 : tests 375/768/1024px, tables scrollables, sidebar utilisable, vérifier marketing/blog/content.  
- Chap 6 : Lighthouse a11y > 95, navigation clavier OK, roles cohérents, doc `DS-CHANGELOG` à jour.

## Risques & parades
- Rupture Tailwind si `@theme inline` mal mappé → vérifier classes génériques avant rollout.  
- Régressions typo sur pages legacy → migrer page par page avec PageSection + Heading.  
- Callouts dégradés si palette non alignée → tester chaque tone (gray/brown/orange/… ).  
- Sidebar mobile bloquante → prévoir fallback drawer simple si sheet non stable.

## Timeline indicative (4 semaines)
- Semaine 1 : Chapitre 1 (tokens unifiés, `@theme inline`, purge valeurs magiques principales).  
- Semaine 2 : Chapitres 2 + 3 (typographie + PageSection, migration pages marketing/gate).  
- Semaine 3 : Chapitre 4 (librairie Notion, blocs manquants, bug bookmark), début responsive tables.  
- Semaine 4 : Chapitres 5 + 6 (responsive complet, sidebar sheet, split CSS, a11y/cleanup).
