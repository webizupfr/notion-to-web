# Design System — Implémentation pragmatique (mapping code actuel)

Ce plan décrit comment appliquer le « Design System Transition Plan (premium Front) » dans notre codebase actuelle, par petites PRs sûres et réversibles.

## 0) État des lieux (utile pour le mapping)

- `src/components/notion/Blocks.tsx` est déjà notre « BlockRenderer » custom. On y gère la plupart des blocs Notion (paragraph, headings, callout, lists, bookmark, code, image…) + widgets.
- `globals.css` définit déjà une base de tokens (variables CSS), boutons, surfaces.
- Des UI existent déjà: `LinkCard`, `Tally`, `widgets/*`.

Conclusion: on garde `Blocks.tsx` comme point d’entrée et on introduit des UI spécialisées progressivement.

## 1) Arborescence cible (incrémentale)

```
/components
  /ui
    H1.tsx                (typographie display, responsive)
    SectionTitle.tsx      (H2/H3 premium)
    InfoCard.tsx          (callout variants: info/success/warning/neutral)
    Accordion.tsx         (toggle → fallback CSS, Radix UI plus tard)
    CodePanel.tsx         (code block avec bouton copy)
    MediaFrame.tsx        (images/vidéos cadrées + caption)
    PullQuote.tsx         (quote stylisée)
  /states
    Skeleton.tsx
    EmptyState.tsx
    ErrorState.tsx
/lib
  /notion
    BlockRenderer.tsx     (optionnel: façade fine qui délègue à Blocks)
  /theme
    tokens.css            (ajouté)
    prose.css             (ajouté)
```

## 2) Tokens & styles de base (fait / à compléter)

- FAIT: `src/lib/theme/tokens.css` + `src/lib/theme/prose.css` importés par `globals.css`.
- À compléter (petites PR):
  - Élargir palette (`--ink-2`, `--muted-2`), densifier ombres (`--shadow-subtle`), ajouter échelles `--space-8..10`.
  - Définir classes utilitaires pour « hover cards », « accordions », « skeleton ».

## 3) Mapping des blocs Notion → Composants UI

- Headings → `H1`, `SectionTitle` (H2/H3)
  - Implémenter dans `/components/ui`, puis remplacer les branches `heading_1/2/3` dans `Blocks.tsx`.
- Callout → `InfoCard` (variants dynamiques selon `color`)
  - Les attributs `data-callout-*` posés par `Blocks.tsx` sont déjà stylés par `prose.css`. Prochaine étape: factoriser en composant `InfoCard` pour centraliser la logique.
- Toggle → `Accordion` (Radix plus tard)
  - Première passe CSS-only (open/close) pour éviter d’ajouter de dépendances.
- Quote → `PullQuote` (filet + italique)
- Numbered list item → `StepItem` (si on veut un rendu numéroté premium)
- Image / Embed → `MediaFrame` (ratio, caption)
- Code → `CodePanel` (copy button, thème clair homogène)
- Bookmark → `LinkCard` (déjà présent, à polisher: favicon, domaine, hover lift)

Chaque remplacement peut être fait bloc par bloc → PRs courtes et testables.

## 4) Interactions / micro-transitions

- Court terme (sans dépendances): transitions CSS (hover, focus, accordions), classes utilitaires existantes.
- Moyen terme: ajouter Framer Motion (si besoin) et Radix UI pour accordions/menus une fois en production (Q1) — pas requis pour rester cohérent.

## 5) États UX

- Ajouter `Skeleton`, `EmptyState`, `ErrorState` et les brancher:
  - `Blocks` (lors des fetchs profond de blocs ou de widgets)
  - Pages index (Sprint/Workshop) pour les listes vides.

## 6) Accessibilité & Responsiveness

- Conserver focus rings (déjà en place), vérifier contrastes AA.
- Mobile: timeline compacte sous contenu (Sprint Module), sidebar repliable — existe déjà partiellement, à polir.

## 7) Découpage en PRs (proposition)

1) PR-DS-01: Tokens & prose (déjà mergée) + H1/SectionTitle (mise à jour headings dans Blocks)
2) PR-DS-02: InfoCard + styles callout; refactor de la branche `callout` (Blocks)
3) PR-DS-03: Accordion (toggle) + transitions CSS
4) PR-DS-04: CodePanel avec bouton copy; thème code
5) PR-DS-05: MediaFrame (image/video) + caption
6) PR-DS-06: PullQuote + StepItem (optionnel)
7) PR-DS-07: Skeleton/Empty/Error + QA a11y (pass AA)

Chaque PR doit:
- modifier `Blocks.tsx` pour le(s) bloc(s) ciblé(s)
- ajouter le composant UI correspondant
- couvrir desktop + mobile.

## 8) Points d’attention

- Ne pas casser la logique widgets (code block → widgets). Conserver la détection actuelle (`parseWidget`).
- Ne pas impacter les hubs/ateliers visuellement d’un coup: activer progressivement bloc par bloc.
- Ne pas introduire de dépendances externes tant que le réseau est bloqué en dev.

## 9) Suivi / Validation

- Checklist visuelle (pages de référence):
  - Hub (accueil + sous-page avec callouts, toggles, quotes)
  - Sprint (accueil + module avec médias/code)
  - Workshop (accueil)
- Perf: LCP < 2s, CLS < 0.02
- Accessibilité: focus visibles, contrastes AA, lecture d’écran minimale sur accordions.

---

Si tu veux, je démarre PR-DS-01 en créant `H1.tsx` et `SectionTitle.tsx`, puis je route `heading_1/2/3` dans `Blocks.tsx` pour avoir un premier impact premium sans risque.
