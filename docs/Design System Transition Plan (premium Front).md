# Impulsion — Design System Transition Plan

> Objectif : transformer l’expérience Notion-render actuelle en une interface **premium, cohérente et hautement lisible**, sans changer la logique de contenu. Ce document sert de **brief technique** pour l’agent de code (développeur) afin d’orchestrer la transition visuelle côté front.

---

## 🎯 Vision

Créer une expérience qui donne la sensation d’un **produit fini**, pas d’un site Notion. L’utilisateur doit ressentir :

* **Clarté et hiérarchie visuelle.**
* **Rythme et cohérence.**
* **Simplicité et élégance.**
* **Micro-interactions subtiles et naturelles.**
* **Rendu fluide et responsive** (desktop ↔ mobile ↔ tablette).

---

## 🧩 Architecture front (Layer d’interprétation)

### 1. Renderer dédié

Créer un **BlockRenderer** centralisé pour surcharger le rendu natif de `react-notion-x` :

```tsx
export function BlockRenderer({ block, context }) {
  switch (block.type) {
    case 'heading_1': return <H1 {...mapHeading(block)} />
    case 'heading_2': return <SectionTitle {...mapHeading(block)} />
    case 'callout':   return <InfoCard {...mapCallout(block)} />
    case 'toggle':    return <Accordion {...mapToggle(block)} />
    case 'quote':     return <PullQuote {...mapQuote(block)} />
    case 'numbered_list_item': return <StepItem {...mapStep(block)} />
    case 'image':     return <MediaFrame {...mapImage(block)} />
    case 'code':      return <CodePanel {...mapCode(block)} />
    case 'bookmark':  return <LinkCard {...mapBookmark(block)} />
    default:          return <RawNotionBlock block={block} />
  }
}
```

👉 **But :** conserver la structure Notion, mais tout **redessiner via UI Impulsion.**

### 2. Tokens & Design System

Définir un set complet de **design tokens** pour garantir la cohérence visuelle :

| Catégorie   | Token                                       | Exemple                             |
| ----------- | ------------------------------------------- | ----------------------------------- |
| Couleurs    | `--brand-amber`, `--ink`, `--muted`, `--bg` | #f59e0b, #0b0b0b, #8b8b8b, #faf7f2  |
| Espacements | `--space-1..10`                             | 4, 8, 12, 16, 24, 32, 40            |
| Rayons      | `--r-sm`, `--r-md`, `--r-xl`                | 10px, 16px, 24px                    |
| Ombres      | `--shadow-soft`, `--shadow-elevated`        | 0 4px 20px rgba(0,0,0,0.06)         |
| Typo        | Syne / Outfit                               | H1=44/48, Body=18/28, Caption=14/20 |

Ces tokens serviront à styliser tous les composants Notion interprétés.

---

## ⚙️ Structure technique recommandée

```
/components
  /ui
    H1.tsx
    SectionTitle.tsx
    InfoCard.tsx
    Accordion.tsx
    StepItem.tsx
    MediaFrame.tsx
    CodePanel.tsx
    LinkCard.tsx
    DataTable.tsx
    Rule.tsx
  /states
    Skeleton.tsx
    EmptyState.tsx
    ErrorState.tsx
  /layout
    HeroCompact.tsx
    SectionHeader.tsx
/lib
  /notion
    mappers.ts
    BlockRenderer.tsx
  /theme
    tokens.css
    prose.css
```

### Librairies recommandées

* **Framer Motion** — transitions douces.
* **TailwindCSS** — rapidité et cohérence (thème custom basé sur tokens).
* **Lucide-react** — icônes légères, vectorielles.
* **Radix UI** — accordéons et menus accessibles.

---

## 🧠 Règles de design premium

### 1. Rythme visuel

* Spacings verticaux fixes : 12 / 16 / 24 / 32 / 40px.
* Jamais de blocs collés (min 12px entre éléments).
* Largeur de texte : 70–75ch max.

### 2. Hiérarchie typographique

* H1 : 44px, bold, letter-spacing -0.02em.
* H2 : 28px, medium, eyebrow possible.
* Paragraphe : 18px, interligne 28px.
* Caption : 14px, gris moyen.

### 3. Composants clés

| Élément  | Composant             | Style cible                                                                |
| -------- | --------------------- | -------------------------------------------------------------------------- |
| Callout  | `InfoCard` (variants) | Fond doux, ombre légère, coins arrondis, **style dynamique selon couleur** |
| Toggle   | `Accordion`           | Border subtile + caret animé                                               |
| Quote    | `PullQuote`           | Filet vertical amber, italique doux                                        |
| Numéroté | `StepItem`            | Pastille numérotée + progression visuelle                                  |
| Image    | `MediaFrame`          | Ratio contrôlé, caption stylisée                                           |
| Code     | `CodePanel`           | Fond neutre, header avec bouton copy                                       |
| Lien     | `LinkCard`            | Card favicon + domaine + hover lift                                        |

> Le bloc **Callout** devient polymorphe : selon la couleur (info, warning, success, neutral), il appelle un sous-composant différent (`InfoCardInfo`, `InfoCardSuccess`, `InfoCardWarning`, etc.) pour un rendu visuel et symbolique distinct.

### 4. Interactions & transitions

* Hover cards : translateY(-2px) + shadow `elevated`.
* Transitions globales : fade 150–200ms, ease-out.
* Accordéons : rotation caret + spring doux.
* Skeletons : shimmer horizontal léger.

### 5. États UX

* **Loading** : Skeleton.
* **Empty** : visuel + CTA clair.
* **Error** : message + bouton retry.

### 6. Accessibilité & Dark Mode

* Contrastes AA (WCAG).
* Focus ring 2px amber.
* `prefers-reduced-motion` respecté.


---

## ✨ Inspirations visuelles

* **Linear.app** : cards minimalistes avec codes couleur.
* **Vercel Dashboard** : sections nettes, accents sobres.
* **Stripe Docs** : callouts informatifs, typographie exemplaire.

---

## 🚀 Roadmap d’implémentation

### Sprint 1 — Base visuelle & typographie

* [ ] Créer tokens.css & prose.css.
* [ ] Intégrer H1, SectionTitle, InfoCard (avec variants), Accordion.

### Sprint 2 — Rendu premium

* [ ] Étendre BlockRenderer → 100% des blocs.
* [ ] Ajouter StepItem, MediaFrame, LinkCard, PullQuote.
* [ ] Implémenter transitions et hover states cohérents.

### Sprint 3 — États, polish & QA

* [ ] Ajouter Skeleton, EmptyState, ErrorState.
* [ ] Ajuster contrastes AA.
* [ ] QA perf/a11y sur Hub / Atelier / Sprint.

---

## ✅ Critères de validation

* Aucun style Notion brut visible.
* Hiérarchie typographique parfaite sur 3 niveaux.
* Composants 100% cohérents visuellement.
* Callouts dynamiques et color-variants opérationnels.
* LCP < 2.0s, CLS < 0.02.
* A11y AA

---

> 🎨 Résultat attendu : une expérience perçue comme **cohérente, premium, rapide et élégante**, avec des callouts dynamiques et identitaires selon leur rôle visuel.
