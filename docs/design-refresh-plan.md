# Design Refresh – Plan d’implémentation

Objectif : transformer l’expérience front du Notion Publisher sans toucher aux contenus Notion. On introduit une nouvelle direction visuelle (navy + lime), une typographie plus forte, et des composants qui transforment les blocs Notion en sections riches.

---

## 1. Scope & contraintes

- ✅ **Pas de migration Notion** : on ne change ni la structure des pages ni la façon dont les auteurs publient. Au maximum, on autorise des `code blocks` YAML pour piloter quelques sections.
- ✅ **Réutilisation progressive** : on garde les widgets, blocs et pages actuels, mais on applique un « wrapper » et des composants (Hero, Split, CardGrid, etc.) autour.
- ✅ **Compatibilité sprint/hub** : le nouveau design doit couvrir les pages modules (sprints) et les pages marketing/hubs.
- ❌ Pas d’overlap avec la logique de synchronisation ou de cohorte : uniquement du front (tailwind/css/React).

---

## 2. Phases

### Phase 1 — Foundations
1. **Design tokens** (`src/lib/theme/tokens.css`)
   - Palette : navy (`#0d1526`), surfaces claires (`#f8fafc`), accent lime (`#d5ff2f`), accent orange.
   - Textes : `--text-strong`, `--text-muted`, `--text-contrast`.
   - Bordures & ombres : `--border-strong`, `--border-soft`, `--shadow-card`, `--shadow-hover`.
2. **Typographies** (`src/app/layout.tsx`, `globals.css`)
   - Import `@next/font`: Display (Antonio/Bebas) + Body (Inter/Manrope).
   - Classes `.headline`, `.eyebrow`, `.muted`.
3. **Base styles**
   - Refonte de `prose.css` (taille H1/H2/H3, listes, blockquote).
   - Boutons `.btn` (primary lime, secondary outline, ghost dark).
   - Spacing utilitaires (`.section`, `.section--compact`).

### Phase 2 — UI Components
Crée un dossier `src/components/ui/v2` (ou équivalent) avec :
 1. **Hero & CTA**
    - `HeroBanner`, `HeroMeta`, `CtaStrip` (full width, fond navy + CTA lime).
  2. **Sections**
    - `SplitSection` (deux colonnes contrastées).
    - `CardGrid` + `CardHighlight`.
    - `StepRail` / `Timeline`.
    - `StatBar` (KPI + labels).
    - `Checklist` (items avec check/cross, states).
    - `ImageFrame` (photo/gradient).
  3. **Navigation**
    - `PageSidebarV2` (progress, badges, CTA “Next/Prev”).

Chaque composant reçoit les données (titre, texte, CTA) via props; ils seront alimentés par les bundles Notion existants.

### Phase 3 — Layout orchestration
1. **Wrapper / template**
   - `PageScaffold`: gère hero, sections, CTA finale.
   - `ModulePageLayout`: structure commune des pages sprint (hero, accomplis, to-do, IA, checklist, CTA).
2. **Section factory**
   - Dans `Blocks.tsx`, détecter un `code` block YAML `layout: split` ou `section: hero` → instancier le composant correspondant.
   - Pas besoin de modifier tout Notion: ajouter ces `code block` sur les pages où l’on veut forcer un layout.
3. **CTA & hero global**
   - Ajouter une `CtaStrip` en bas des pages (via `/(site)/layout.tsx`).

### Phase 4 — Animations & polish
1. **Framer Motion** : transitions de sections, hover des cartes, glow des CTA.
2. **Icons** : remplacer les emojis UI par un set Lucide (composants dans `src/components/ui/icons.tsx`).
3. **Responsive** : vérifier sidebar (drawer mobile), hero (stacked), CTA (full width).

### Phase 5 — Intégration progressive
1. **Page pilote** : implémenter `ModulePageLayout` sur un module (ex : “Tester le terrain”), valider design, QA.
2. **Hubs / marketing** : créer `LandingPageLayout` (hero + split + cards + CTA) alimenté par les données Notion.
3. **Feature flag** : `NEXT_PUBLIC_DESIGN_V2` pour activer/désactiver le nouveau thème en staging puis en prod.

---

## 3. Checklist par tâche

- [ ] Mettre à jour tokens + globaux (palette, typo, boutons, spacing).
- [x] Créer composants UI V2 (hero, splits, cards, steps, CTA, sidebar).
- [x] Implémenter `PageScaffold` et `ModulePageLayout`.
- [x] Adapter `Blocks.tsx` pour reconnaître les `code` blocks YAML et déclencher les composants. (SectionFactory posée, branchement Blocks reste à faire)
- [ ] Revisiter `PageSidebar` (progress, CTA, navigation).
- [ ] Ajouter animations Framer Motion.
- [ ] Appliquer sur une page pilote, QA responsive + accessibilité.
- [ ] Documenter dans `docs/design-refresh-plan.md` (ce fichier) et ajouter le feature flag.

---

## 4. Guiding principles

- **Contraste** : sections alternent entre fond clair, fond navy, fond accent. Aucune carte blanche sur fond blanc.
- **Typo** : headlines agressives (uppercase, spacing), corps sobre.
- **CTA visibles** : boutons full-bleed lime ou dark, pas de “ghost” sans contexte.
- **Moments visuels** : hero massif, stat bar, image encadrée.
- **Consistance** : badges & tags uniformes, icônes harmonisées.
- **Anim léger** : motions pour donner vie (scroll reveal, hover).

---

## 5. Livrables

- `src/lib/theme/tokens.css` + `globals.css` refactorisés.
- Ensemble de composants `ui/v2` documentés (props + story).
- Nouveaux layouts (ModulePageLayout/LandingLayout) branchés.
- Feature flag + instructions de déploiement.

Une fois ce plan validé, on peut entrer dans le développement concret (phase par phase). 
